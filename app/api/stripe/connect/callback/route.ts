import { NextResponse } from "next/server"
import { refreshStripeAccount } from "@/lib/actions"

export const runtime = "nodejs"

export async function GET() {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!origin) return NextResponse.json({ error: "Application URL unavailable" }, { status: 503 })
  try {
    const ready = await refreshStripeAccount()
    return NextResponse.redirect(new URL(`/mypage?tab=payouts&stripe=${ready ? "ready" : "incomplete"}`, origin))
  } catch {
    return NextResponse.redirect(new URL("/mypage?tab=payouts&stripe=error", origin))
  }
}
