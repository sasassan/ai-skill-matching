"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBooking, createOrder, sendMessage } from "@/lib/actions"
import type { Listing } from "@/lib/models"

export function TradeRequestForm({ listing }: { listing: Listing }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [start, setStart] = useState("")
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    const form = new FormData(event.currentTarget)
    try {
      if (listing.fulfillmentType === "booking") {
        const id = await createBooking({
          listingId: listing.id,
          scheduledStart: String(form.get("start")),
          scheduledEnd: String(form.get("end")),
          placeType: String(form.get("place")) as
            "provider" | "customer" | "online",
          placeNote: String(form.get("placeNote") ?? ""),
        })
        const message = String(form.get("message") ?? "").trim()
        if (message) {
          try {
            await sendMessage("booking", id, message)
          } catch {
            router.push(`/bookings/${id}?message_failed=1`)
            return
          }
        }
        router.push(`/bookings/${id}`)
      } else {
        const id = await createOrder({
          listingId: listing.id,
          providerProfileId: listing.providerId,
          title: String(form.get("title")),
          description: String(form.get("description")),
          specification: {
            budget: String(form.get("budget") ?? ""),
            deadline: String(form.get("deadline") ?? ""),
          },
        })
        router.push(`/orders/${id}`)
      }
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "送信できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  const input = "mt-1 w-full rounded-lg border bg-background px-3 py-2"
  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border bg-card p-6"
    >
      {listing.fulfillmentType === "booking" ? (
        <>
          <label className="block text-sm font-medium">
            開始日時
            <input
              name="start"
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
              className={input}
            />
          </label>
          <label className="block text-sm font-medium">
            終了日時
            <input
              name="end"
              type="datetime-local"
              min={start || undefined}
              required
              className={input}
            />
          </label>
          <label className="block text-sm font-medium">
            場所
            <select name="place" className={input}>
              <option value="provider">提供者の場所</option>
              <option value="customer">利用者の場所</option>
              <option value="online">オンライン</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            場所の詳細
            <input name="placeNote" maxLength={1000} className={input} />
          </label>
          <label className="block text-sm font-medium">
            メッセージ
            <textarea name="message" maxLength={5000} className={input} />
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm font-medium">
            相談タイトル
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={`${listing.title}についての相談`}
              className={input}
            />
          </label>
          <label className="block text-sm font-medium">
            仕様・メッセージ
            <textarea
              name="description"
              required
              maxLength={5000}
              rows={6}
              className={input}
            />
          </label>
          <label className="block text-sm font-medium">
            予算
            <input name="budget" maxLength={200} className={input} />
          </label>
          <label className="block text-sm font-medium">
            希望納期
            <input name="deadline" type="date" className={input} />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded-lg bg-primary px-6 py-3 text-white"
      >
        {busy
          ? "送信中…"
          : listing.fulfillmentType === "booking"
            ? "予約を申し込む"
            : "相談を送る"}
      </button>
    </form>
  )
}
