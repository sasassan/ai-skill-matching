"use client"

import { useEffect, useRef, useState } from "react"
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js"
import { useRouter } from "next/navigation"
import { processPayment, transferToProvider } from "@/lib/actions"
import type { FulfillmentType } from "@/lib/models"

export function PaymentForm({ type, tradeId, publishableKey }: { type: FulfillmentType; tradeId: string; publishableKey: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [ready, setReady] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const stripe = useRef<Stripe | null>(null)
  const card = useRef<StripeCardElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let element: StripeCardElement | null = null
    void loadStripe(publishableKey).then((client) => {
      if (cancelled || !client || !container.current) return
      stripe.current = client
      element = client.elements().create("card", { hidePostalCode: true })
      card.current = element
      element.mount(container.current)
      element.on("ready", () => setReady(true))
    }).catch(() => setMessage("カード入力を読み込めませんでした。"))
    return () => { cancelled = true; element?.destroy(); card.current = null; setReady(false) }
  }, [open, publishableKey])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe.current || !card.current) return
    setBusy(true)
    setMessage("")
    try {
      const { clientSecret } = await processPayment(type, tradeId)
      const result = await stripe.current.confirmCardPayment(clientSecret, { payment_method: { card: card.current } })
      if (result.error) throw new Error(result.error.message || "決済を完了できませんでした。")
      setMessage("支払いを受け付けました。確定まで少しお待ちください。")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "支払いを完了できませんでした。")
    } finally { setBusy(false) }
  }

  if (!open) return <button onClick={() => setOpen(true)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-white">支払う</button>
  return <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border p-4">
    <label htmlFor="card-element" className="block font-medium">カード情報</label>
    <div id="card-element" ref={container} className="rounded border bg-background p-3" />
    <button disabled={busy || !ready} className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50">{busy ? "処理中…" : "カードで支払う"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>
}

export function RetryTransfer({ type, tradeId }: { type: FulfillmentType; tradeId: string }) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function retry() {
    setBusy(true)
    try { await transferToProvider(type, tradeId); setMessage("送金を受け付けました。"); router.refresh() }
    catch (error) { setMessage(error instanceof Error ? error.message : "送金を再試行できませんでした。") }
    finally { setBusy(false) }
  }
  return <div className="mt-4"><button disabled={busy} onClick={() => void retry()} className="rounded-lg border px-4 py-2">提供者への送金を再試行</button>{message && <p role="status" className="mt-2 text-sm">{message}</p>}</div>
}
