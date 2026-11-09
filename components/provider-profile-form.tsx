"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveProviderProfile } from "@/lib/actions"
import type { ProviderProfile } from "@/lib/models"
export function ProviderProfileForm({
  provider,
}: {
  provider?: ProviderProfile
}) {
  const [message, setMessage] = useState("")
  const router = useRouter()
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await saveProviderProfile({
        bio: String(form.get("bio")),
        location: String(form.get("location")),
        prefecture: String(form.get("prefecture")),
        serviceAreas: String(form.get("areas"))
          .split(/[,、]/)
          .map((value) => value.trim())
          .filter(Boolean),
        qualifications: String(form.get("qualifications"))
          .split(/[,、]/)
          .map((value) => value.trim())
          .filter(Boolean),
      })
      setMessage("保存しました。")
      router.refresh()
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "保存できませんでした。"
      )
    }
  }
  const input = "mt-1 w-full rounded-lg border bg-background p-2"
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        自己紹介
        <textarea
          name="bio"
          defaultValue={provider?.bio ?? ""}
          maxLength={5000}
          className={input}
        />
      </label>
      <label className="block">
        都道府県
        <input
          name="prefecture"
          defaultValue={provider?.prefecture ?? ""}
          className={input}
        />
      </label>
      <label className="block">
        所在地
        <input
          name="location"
          defaultValue={provider?.location ?? ""}
          className={input}
        />
      </label>
      <label className="block">
        対応地域（読点区切り）
        <input
          name="areas"
          defaultValue={provider?.serviceAreas.join("、") ?? ""}
          className={input}
        />
      </label>
      <label className="block">
        資格（読点区切り）
        <input
          name="qualifications"
          defaultValue={provider?.qualifications.join("、") ?? ""}
          className={input}
        />
      </label>
      <button className="rounded-lg bg-primary px-5 py-2 text-white">
        保存する
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}
