"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendMessage } from "@/lib/actions"
import type { FulfillmentType, TradeMessage } from "@/lib/models"
export function MessageThread({
  type,
  tradeId,
  messages,
  userId,
}: {
  type: FulfillmentType
  tradeId: string
  messages: TradeMessage[]
  userId: string
}) {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setBusy(true)
    setError("")
    try {
      await sendMessage(
        type,
        tradeId,
        String(new FormData(form).get("message"))
      )
      form.reset()
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "送信できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">メッセージ</h2>
      <div className="my-5 space-y-3">
        {messages.length ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl p-4 ${message.senderId === userId ? "ml-auto bg-secondary" : "border bg-card"} max-w-xl`}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              <time className="mt-2 block text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleString("ja-JP")}
              </time>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">メッセージはまだありません。</p>
        )}
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm" htmlFor="message">
          メッセージを送る
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={5000}
          rows={3}
          className="w-full rounded-lg border bg-card p-3"
        />
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="rounded-lg bg-primary px-5 py-2 text-white"
        >
          {busy ? "送信中…" : "送信"}
        </button>
      </form>
    </section>
  )
}
