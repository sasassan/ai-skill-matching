import "server-only"

import Stripe from "stripe"

export const stripeConnectEnabled = Boolean(process.env.STRIPE_SECRET_KEY?.trim())

export const stripePaymentEnabled = Boolean(
  stripeConnectEnabled &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() &&
  process.env.STRIPE_WEBHOOK_SECRET?.trim() &&
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
  (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()) &&
  process.env.NEXT_PUBLIC_APP_URL?.trim()
)

export const stripeUnavailableMessage = "決済機能を利用するにはStripe設定が必要です"

export function stripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) throw new Error(stripeUnavailableMessage)
  return new Stripe(secret)
}

export async function createConnectAccount(email: string, providerId: string) {
  return stripeClient().accounts.create(
    {
      type: "express",
      country: "JP",
      email,
      capabilities: { transfers: { requested: true } },
      metadata: { provider_id: providerId },
      settings: { payouts: { schedule: { interval: "manual" } } },
    },
    { idempotencyKey: `connect-account-${providerId}` }
  )
}

export async function createAccountLink(account: string, origin: string) {
  return stripeClient().accountLinks.create({
    account,
    refresh_url: `${origin}/mypage?tab=payouts`,
    return_url: `${origin}/api/stripe/connect/callback`,
    type: "account_onboarding",
  })
}

export async function createPaymentIntent(paymentId: string, amount: number) {
  return stripeClient().paymentIntents.create(
    {
      amount,
      currency: "jpy",
      allowed_payment_method_types: ["card"],
      transfer_group: `payment_${paymentId}`,
      metadata: { payment_id: paymentId },
    },
    { idempotencyKey: `payment-${paymentId}` }
  )
}

export async function confirmPayment(paymentIntentId: string) {
  return stripeClient().paymentIntents.confirm(paymentIntentId)
}

export async function createTransfer(input: {
  paymentId: string
  amount: number
  accountId: string
  chargeId: string
}) {
  return stripeClient().transfers.create(
    {
      amount: input.amount,
      currency: "jpy",
      destination: input.accountId,
      source_transaction: input.chargeId,
      transfer_group: `payment_${input.paymentId}`,
      metadata: { payment_id: input.paymentId },
    },
    { idempotencyKey: `transfer-${input.paymentId}` }
  )
}

export async function createRefund(paymentIntentId: string, paymentId: string) {
  return stripeClient().refunds.create(
    { payment_intent: paymentIntentId },
    { idempotencyKey: `refund-${paymentId}` }
  )
}

export async function getAccountStatus(accountId: string) {
  return stripeClient().accounts.retrieve(accountId)
}

export async function getBalance(accountId: string) {
  return stripeClient().balance.retrieve({}, { stripeAccount: accountId })
}

export async function createPayout(accountId: string, amount: number, payoutId: string) {
  return stripeClient().payouts.create(
    { amount, currency: "jpy", metadata: { payout_id: payoutId } },
    { stripeAccount: accountId, idempotencyKey: `payout-${payoutId}` }
  )
}
