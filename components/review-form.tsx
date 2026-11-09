"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createTradeReview } from "@/lib/actions"
import type { FulfillmentType } from "@/lib/models"
export function ReviewForm({
  type,
  tradeId,
}: {
  type: FulfillmentType
  tradeId: string
}) {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await createTradeReview(
        type,
        tradeId,
        Number(form.get("rating")),
        String(form.get("comment") ?? "")
      )
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "投稿できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-8 space-y-3 rounded-xl border bg-card p-5"
    >
      <h2 className="font-bold">レビューを投稿</h2>
      <label className="block">
        評価{" "}
        <select name="rating" className="rounded border p-2">
          {[5, 4, 3, 2, 1].map((number) => (
            <option key={number} value={number}>
              {number} / 5
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        コメント
        <textarea
          name="comment"
          maxLength={5000}
          className="mt-1 w-full rounded border p-2"
        />
      </label>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded-lg bg-primary px-5 py-2 text-white"
      >
        {busy ? "投稿中…" : "投稿する"}
      </button>
    </form>
  )
}
