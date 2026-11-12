import "server-only"

import type Stripe from "stripe"
import { createServiceSupabaseClient } from "@/lib/supabase-server"
import { createTransfer, getAccountStatus, stripeClient, stripePaymentEnabled, stripeUnavailableMessage } from "@/lib/stripe"

const retryWindow = 23 * 60 * 60 * 1000

export function requirePaymentConfiguration() {
  if (!stripePaymentEnabled) throw new Error(stripeUnavailableMessage)
}

export function requireSafeRetry(attemptedAt: string | null) {
  if (attemptedAt && Date.now() - new Date(attemptedAt).getTime() > retryWindow) {
    throw new Error("処理結果を確認できません。重複を防ぐため管理者にお問い合わせください。")
  }
}

export async function syncConnectAccount(accountId: string) {
  const account = await getAccountStatus(accountId)
  const ready = Boolean(account.details_submitted && account.payouts_enabled && account.capabilities?.transfers === "active")
  const db = createServiceSupabaseClient()
  const { error } = await db.from("provider_profiles").update({ stripe_onboarding_completed: ready }).eq("stripe_account_id", accountId)
  if (error) throw new Error("Stripeアカウント状態を保存できませんでした。")
  return ready
}

export async function releasePayment(type: "booking" | "order", tradeId: string) {
  requirePaymentConfiguration()
  const db = createServiceSupabaseClient()
  const column = type === "booking" ? "booking_id" : "order_id"
  const { data: payment, error } = await db.from("payments").select("*").eq(column, tradeId).maybeSingle()
  if (error) throw new Error("支払いを確認できませんでした。")
  if (!payment) return
  if (payment.status === "transferred") return
  if (!["captured", "transferring"].includes(payment.status) || !payment.stripe_charge_id) throw new Error("支払いの確定後に送金できます。")
  const { data: trade, error: tradeError } = await db.from(type === "booking" ? "bookings" : "orders").select("status").eq("id", tradeId).maybeSingle()
  if (tradeError || !trade || !["completed", "reviewed"].includes(trade.status)) throw new Error("取引完了後に送金できます。")
  const { data: provider, error: providerError } = await db.from("provider_profiles").select("stripe_account_id,stripe_onboarding_completed").eq("id", payment.provider_id).single()
  if (providerError || !provider?.stripe_account_id || !provider.stripe_onboarding_completed) throw new Error("提供者のStripe登録が完了していません。")
  const charge = await stripeClient().charges.retrieve(payment.stripe_charge_id)
  if (!charge.paid || charge.refunded || charge.amount_refunded > 0 || charge.disputed || charge.amount !== payment.amount || charge.currency !== "jpy") throw new Error("返金または異議申し立てのある支払いは送金できません。")
  requireSafeRetry(payment.transfer_attempted_at)
  if (!payment.transfer_attempted_at) {
    const { data: claim, error: claimError } = await db.from("payments").update({ status: "transferring", transfer_attempted_at: new Date().toISOString() }).eq("id", payment.id).eq("status", "captured").select("id").maybeSingle()
    if (claimError || !claim) throw new Error("送金処理中または支払い状態が変更されています。")
  }
  const transfer = await createTransfer({ paymentId: payment.id, amount: payment.amount - payment.platform_fee, accountId: provider.stripe_account_id, chargeId: payment.stripe_charge_id })
  const { error: updateError } = await db.from("payments").update({ status: "transferred", stripe_transfer_id: transfer.id }).eq("id", payment.id).in("status", ["transferring", "transferred"])
  if (updateError) throw new Error("送金結果を保存できませんでした。")
}

export async function handleStripeEvent(event: Stripe.Event) {
  const db = createServiceSupabaseClient()
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent
    const paymentId = intent.metadata.payment_id
    const chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id
    if (!paymentId || !chargeId || intent.currency !== "jpy") throw new Error("Invalid payment event")
    const { data: payment, error } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle()
    if (error || !payment || payment.amount !== intent.amount || (payment.stripe_payment_intent_id && payment.stripe_payment_intent_id !== intent.id)) throw new Error("Payment event mismatch")
    if (payment.status === "pending") {
      const { error: updateError } = await db.from("payments").update({ status: "captured", stripe_payment_intent_id: intent.id, stripe_charge_id: chargeId }).eq("id", paymentId).eq("status", "pending")
      if (updateError) throw updateError
    }
  } else if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const object = event.data.object
    const disputedCharge = event.type === "charge.dispute.created" ? (object as Stripe.Dispute).charge : null
    const chargeId = event.type === "charge.refunded" ? (object as Stripe.Charge).id : typeof disputedCharge === "string" ? disputedCharge : disputedCharge?.id
    if (!chargeId) throw new Error("Charge event missing charge")
    const { data: payment, error } = await db.from("payments").select("id,status,stripe_transfer_id").eq("stripe_charge_id", chargeId).maybeSingle()
    if (error || !payment) throw new Error("Charge event payment not found")
    const fullyRefunded = event.type === "charge.refunded" && (object as Stripe.Charge).refunded
    const status = fullyRefunded && !payment.stripe_transfer_id && payment.status !== "transferring" ? "refunded" : "disputed"
    const { error: updateError } = await db.from("payments").update({ status }).eq("id", payment.id)
    if (updateError) throw updateError
  } else if (event.type === "transfer.created") {
    const transfer = event.data.object as Stripe.Transfer
    const paymentId = transfer.metadata.payment_id
    if (!paymentId) return
    const { data: payment, error } = await db.from("payments").select("*, provider:provider_profiles(stripe_account_id)").eq("id", paymentId).maybeSingle()
    const provider = Array.isArray(payment?.provider) ? payment.provider[0] : payment?.provider
    const destination = typeof transfer.destination === "string" ? transfer.destination : transfer.destination?.id
    const source = typeof transfer.source_transaction === "string" ? transfer.source_transaction : transfer.source_transaction?.id
    if (error || !payment || !provider || transfer.currency !== "jpy" || transfer.amount !== payment.amount - payment.platform_fee || destination !== provider.stripe_account_id || source !== payment.stripe_charge_id) throw new Error("Transfer event mismatch")
    const { error: updateError } = await db.from("payments").update({ status: "transferred", stripe_transfer_id: transfer.id }).eq("id", paymentId).in("status", ["transferring", "transferred"])
    if (updateError) throw updateError
  } else if (event.type === "payout.paid" || event.type === "payout.failed" || event.type === "payout.canceled") {
    const payout = event.data.object as Stripe.Payout
    const payoutId = payout.metadata?.payout_id
    if (!payoutId) return
    const { data: record, error } = await db.from("payouts").select("*, provider:provider_profiles(stripe_account_id)").eq("id", payoutId).maybeSingle()
    const provider = Array.isArray(record?.provider) ? record.provider[0] : record?.provider
    if (error || !record || !provider || !event.account || event.account !== provider.stripe_account_id || payout.currency !== "jpy" || payout.amount !== record.amount || (record.stripe_payout_id && record.stripe_payout_id !== payout.id)) throw new Error("Payout event mismatch")
    const current = await stripeClient().payouts.retrieve(payout.id, {}, { stripeAccount: event.account })
    const status = current.status === "paid" ? "completed" : current.status === "failed" ? "failed" : current.status === "canceled" ? "cancelled" : null
    if (!status) return
    const allowedStatuses = status === "completed" ? ["pending"] : ["pending", "completed"]
    const { error: updateError } = await db.from("payouts").update({ status, stripe_payout_id: payout.id, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", payoutId).in("status", allowedStatuses)
    if (updateError) throw updateError
  } else if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account
    await syncConnectAccount(account.id)
  }
}
