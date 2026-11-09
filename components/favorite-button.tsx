"use client"
import { useState, useTransition } from "react"
import Link from "next/link"
import { toggleFavorite } from "@/lib/actions"

export function FavoriteButton({
  listingId,
  initialFavorite,
  loggedIn,
}: {
  listingId: string
  initialFavorite: boolean
  loggedIn: boolean
}) {
  const [favorite, setFavorite] = useState(initialFavorite)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  if (!loggedIn)
    return (
      <Link
        className="rounded-lg border px-4 py-2 text-sm"
        href={`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`}
      >
        お気に入りに登録
      </Link>
    )
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        aria-pressed={favorite}
        className="rounded-lg border px-4 py-2 text-sm"
        onClick={() =>
          startTransition(async () => {
            try {
              setFavorite(await toggleFavorite(listingId))
              setError("")
            } catch {
              setError("お気に入りを更新できませんでした。")
            }
          })
        }
      >
        {favorite ? "♥ お気に入り済み" : "♡ お気に入りに登録"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
