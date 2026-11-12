"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { bookingStatus, orderStatus, submitOrderQuote } from "@/lib/actions"
import type { BookingStatus, FulfillmentType, OrderStatus } from "@/lib/models"
export function TradeActions({
  type,
  tradeId,
  options,
  quote,
}: {
  type: FulfillmentType
  tradeId: string
  options: { status: BookingStatus | OrderStatus; label: string }[]
  quote?: boolean
}) {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function change(status: BookingStatus | OrderStatus) {
    setBusy(true)
    setError("")
    try {
      if (type === "booking")
        await bookingStatus(tradeId, status as BookingStatus)
      else await orderStatus(tradeId, status as OrderStatus)
      router.refresh()
    } catch (caught) {
      router.refresh()
      setError(
        caught instanceof Error
          ? caught.message
          : "状態を変更できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      await submitOrderQuote(
        tradeId,
        Number(form.get("amount")),
        String(form.get("description"))
      )
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "見積もりを送信できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.status}
            disabled={busy}
            onClick={() => void change(option.status)}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary"
          >
            {option.label}
          </button>
        ))}
      </div>
      {quote && (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-xl border bg-card p-5"
        >
          <h2 className="font-bold">見積もりを提示</h2>
          <label className="block">
            金額（円）
            <input
              type="number"
              name="amount"
              min="1"
              max="1000000000"
              required
              className="mt-2 w-full rounded border p-2"
            />
          </label>
          <label className="block">
            内容
            <textarea
              name="description"
              required
              maxLength={5000}
              className="mt-2 w-full rounded border p-2"
            />
          </label>
          <button
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 text-white"
          >
            {busy ? "送信中…" : "見積もりを送る"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
