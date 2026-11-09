"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveAccountName } from "@/lib/platform-actions"
export function AccountForm({ name, email }: { name: string; email: string }) {
  const [message, setMessage] = useState("")
  const router = useRouter()
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await saveAccountName(
        String(new FormData(event.currentTarget).get("name"))
      )
      setMessage("保存しました。")
      router.refresh()
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "保存できませんでした。"
      )
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        表示名
        <input
          required
          name="name"
          maxLength={120}
          defaultValue={name}
          className="mt-1 w-full rounded-lg border bg-background p-3"
        />
      </label>
      <p>メールアドレス: {email}</p>
      <button className="rounded-lg bg-primary px-5 py-2 text-white">
        保存する
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}
