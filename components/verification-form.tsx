"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitVerification } from "@/lib/actions"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import type { Category } from "@/lib/models"
export function VerificationForm({
  categories,
  userId,
}: {
  categories: Category[]
  userId: string
}) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setMessage("")
    try {
      let documentPath: string | undefined
      const file = form.get("document")
      if (file instanceof File && file.size) {
        const client = createBrowserSupabaseClient()
        documentPath = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        const { error } = await client.storage
          .from("verifications")
          .upload(documentPath, file, { contentType: file.type })
        if (error) throw new Error("書類をアップロードできませんでした。")
      }
      await submitVerification({
        categoryId: String(form.get("category")),
        type: String(form.get("type")) as
          "license" | "permit" | "insurance" | "training" | "other",
        name: String(form.get("name")),
        documentPath,
      })
      setMessage("資格確認を申請しました。")
      router.refresh()
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "申請できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        カテゴリ
        <select
          name="category"
          required
          className="mt-1 w-full rounded border p-2"
        >
          {categories.map((category) => (
            <option value={category.id} key={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        種別
        <select name="type" className="mt-1 w-full rounded border p-2">
          <option value="license">免許・資格</option>
          <option value="permit">許可・届出</option>
          <option value="insurance">保険</option>
          <option value="training">研修</option>
          <option value="other">その他</option>
        </select>
      </label>
      <label className="block">
        名称
        <input
          name="name"
          required
          maxLength={200}
          className="mt-1 w-full rounded border p-2"
        />
      </label>
      <label className="block">
        確認書類
        <input
          name="document"
          type="file"
          className="mt-1 w-full rounded border p-2"
        />
      </label>
      <button
        disabled={busy || !categories.length}
        className="rounded-lg bg-primary px-5 py-2 text-white"
      >
        {busy ? "送信中…" : "申請する"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}
