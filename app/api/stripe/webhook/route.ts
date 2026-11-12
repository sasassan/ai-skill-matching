import { NextResponse } from "next/server"
import { handleStripeEvent } from "@/lib/payment-service"
import { stripeClient } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET?.trim(), process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim()].filter((value): value is string => Boolean(value))
  if (!signature || !secrets.length || !process.env.STRIPE_SECRET_KEY?.trim()) return NextResponse.json({ error: "Webhook unavailable" }, { status: 400 })
  const body = await request.text()
  let event
  for (const secret of secrets) {
    try {
      event = stripeClient().webhooks.constructEvent(body, signature, secret)
      break
    } catch {}
  }
  if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  try {
    await handleStripeEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook processing failed", error instanceof Error ? error.message : "unknown error")
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
