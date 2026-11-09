"use client"
import { useState } from "react"
import Link from "next/link"
import { createReport } from "@/lib/actions"

export function ReportForm({
  listingId,
  loggedIn,
}: {
  listingId: string
  loggedIn: boolean
}) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  if (!loggedIn)
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`}
        className="text-sm text-muted-foreground underline"
      >
        ログインして出品を通報
      </Link>
    )
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setMessage("")
    try {
      await createReport({
        targetType: "listing",
        targetId: listingId,
        reason: String(form.get("reason")) as
          | "illegal"
          | "fraud"
          | "harassment"
          | "adult"
          | "off_platform_payment"
          | "other",
        details: String(form.get("details") ?? ""),
      })
      setMessage("通報を受け付けました。")
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "通報を送信できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground underline">
        この出品を通報する
      </summary>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="block">
          理由
          <select
            name="reason"
            className="mt-1 w-full rounded border bg-background p-2"
          >
            <option value="illegal">違法な内容</option>
            <option value="fraud">詐欺</option>
            <option value="harassment">嫌がらせ</option>
            <option value="adult">成人向け・出会い目的</option>
            <option value="off_platform_payment">サービス外決済への勧誘</option>
            <option value="other">その他</option>
          </select>
        </label>
        <label className="block">
          詳細
          <textarea
            name="details"
            maxLength={5000}
            className="mt-1 w-full rounded border bg-background p-2"
          />
        </label>
        <button disabled={busy} className="rounded border px-4 py-2">
          {busy ? "送信中…" : "通報を送信"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  )
}
