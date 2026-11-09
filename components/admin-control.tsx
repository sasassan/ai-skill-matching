"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  adminSetCategoryVisibility,
  adminReviewVerification,
  adminUpdateReport,
} from "@/lib/actions"
import { adminListingStatus } from "@/lib/platform-actions"
export function AdminControl({
  id,
  kind,
  visible,
}: {
  id: string
  kind: "category" | "verification" | "report" | "listing"
  visible?: boolean
}) {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function act(value: string) {
    setBusy(true)
    setError("")
    try {
      if (kind === "category")
        await adminSetCategoryVisibility(id, value === "public")
      if (kind === "verification")
        await adminReviewVerification(id, value as "approved" | "rejected")
      if (kind === "report")
        await adminUpdateReport(
          id,
          value as "reviewing" | "actioned" | "dismissed"
        )
      if (kind === "listing")
        await adminListingStatus(id, value as "paused" | "archived")
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "更新できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  const choices =
    kind === "category"
      ? [
          [
            visible ? "private" : "public",
            visible ? "非公開にする" : "公開する",
          ],
        ]
      : kind === "verification"
        ? [
            ["approved", "承認"],
            ["rejected", "却下"],
          ]
        : kind === "report"
          ? [
              ["reviewing", "対応中"],
              ["actioned", "対応済み"],
              ["dismissed", "却下"],
            ]
          : [
              ["paused", "一時停止"],
              ["archived", "非公開"],
            ]
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {choices.map(([value, label]) => (
          <button
            disabled={busy}
            key={value}
            onClick={() => void act(value)}
            className="rounded border px-3 py-1 text-sm hover:bg-secondary"
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
