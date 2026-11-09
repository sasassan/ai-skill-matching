"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  addListingImage,
  changeListing,
  createListing,
  removeListingImage,
} from "@/lib/actions"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import type { Category, Listing, ListingStatus } from "@/lib/models"

export function ListingForm({
  categories,
  listing,
  userId,
}: {
  categories: Category[]
  listing?: Listing
  userId: string
}) {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [priceBasis, setPriceBasis] = useState(listing?.priceBasis ?? "consultation")
  const [categoryId, setCategoryId] = useState(
    listing?.categoryId ?? categories[0]?.id ?? ""
  )
  const router = useRouter()
  const category = categories.find((item) => item.id === categoryId)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    const amount = String(form.get("price") ?? "")
    const values = {
      title: String(form.get("title")),
      description: String(form.get("description")),
      priceBasis: String(form.get("priceBasis")) as
        "fixed" | "hourly" | "consultation",
      price: amount === "" ? null : Number(amount),
      serviceAreas: String(form.get("areas") ?? "")
        .split(/[,、]/)
        .map((area) => area.trim())
        .filter(Boolean),
      location: String(form.get("location") ?? ""),
      status: String(form.get("status")) as ListingStatus,
    }
    try {
      const saved = listing
        ? await changeListing(listing.id, values)
        : await createListing({
            ...values,
            categoryId,
            fulfillmentType: String(form.get("type")) as "booking" | "order",
          })
      const file = form.get("image")
      if (file instanceof File && file.size) {
        try {
          const client = createBrowserSupabaseClient()
          const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
          const { error: uploadError } = await client.storage
            .from("listing-images")
            .upload(path, file, { contentType: file.type })
          if (uploadError) throw uploadError
          const { data } = client.storage
            .from("listing-images")
            .getPublicUrl(path)
          await addListingImage(saved.id, data.publicUrl)
        } catch {
          router.push(`/listings/${saved.id}/edit?image_failed=1`)
          router.refresh()
          return
        }
      }
      router.push("/mypage?tab=listings")
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "出品を保存できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  async function remove(id: string) {
    try {
      await removeListingImage(id)
      router.refresh()
    } catch {
      setError("画像を削除できませんでした。")
    }
  }
  const input = "mt-1 w-full rounded-lg border bg-background p-3"
  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border bg-card p-6"
    >
      <label className="block">
        カテゴリ
        <select
          required
          disabled={Boolean(listing)}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={input}
        >
          <option value="">選択してください</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {category?.requiresVerification && (
        <p className="rounded-lg border p-3 text-sm" role="status">
          このカテゴリへの出品には資格確認の承認が必要です。
          <Link href="/mypage?tab=verifications" className="text-primary underline">資格確認を申請する</Link>
        </p>
      )}
      {category?.verificationNotes && (
        <p className="text-sm text-muted-foreground">
          {category.verificationNotes}
        </p>
      )}
      <label className="block">
        方式
        <select
          name="type"
          disabled={Boolean(listing)}
          defaultValue={listing?.fulfillmentType}
          className={input}
        >
          {(category?.supportedFulfillmentTypes ?? []).map((type) => (
            <option key={type} value={type}>
              {type === "booking" ? "予約" : "制作・納品"}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        タイトル
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={listing?.title}
          className={input}
        />
      </label>
      <label className="block">
        説明
        <textarea
          name="description"
          required
          maxLength={5000}
          rows={6}
          defaultValue={listing?.description}
          className={input}
        />
      </label>
      <label className="block">
        料金方式
        <select
          name="priceBasis"
          value={priceBasis}
          onChange={(event) => setPriceBasis(event.target.value as typeof priceBasis)}
          className={input}
        >
          <option value="consultation">相談</option>
          <option value="fixed">固定</option>
          <option value="hourly">時間単位</option>
        </select>
      </label>
      <label className="block">
        価格（円）
        <input
          name="price"
          type="number"
          min="1"
          max="1000000000"
          required={priceBasis !== "consultation"}
          defaultValue={listing?.price ?? ""}
          className={input}
        />
      </label>
      <label className="block">
        対応エリア（読点区切り）
        <input
          name="areas"
          defaultValue={listing?.serviceAreas.join("、")}
          className={input}
        />
      </label>
      <label className="block">
        場所
        <input
          name="location"
          defaultValue={listing?.location ?? ""}
          className={input}
        />
      </label>
      <label className="block">
        公開状態
        <select
          name="status"
          defaultValue={listing?.status ?? "draft"}
          className={input}
        >
          <option value="draft">下書き</option>
          <option value="published">公開</option>
          <option value="paused">一時停止</option>
          <option value="archived">非公開</option>
        </select>
      </label>
      <label className="block">
        画像を追加（8MB以下）
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className={input}
        />
      </label>
      {listing?.images?.map((image) => (
        <div key={image.id} className="flex items-center gap-4">
          <img
            src={image.url}
            alt="出品画像"
            className="h-20 w-20 rounded object-cover"
          />
          <button
            type="button"
            onClick={() => void remove(image.id)}
            className="text-sm underline"
          >
            画像を削除
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <button
        disabled={busy || !categories.length}
        className="rounded-lg bg-primary px-6 py-3 text-white"
      >
        {busy ? "保存中…" : "保存する"}
      </button>
    </form>
  )
}
