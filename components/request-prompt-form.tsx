"use client"
import { useState } from "react"
import Link from "next/link"
import { recommendListings, type ListingRecommendation } from "@/lib/ai"

export function RequestPromptForm() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ListingRecommendation[] | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      setResults(await recommendListings(query))
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "AI相談を利用できませんでした。"
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <form onSubmit={submit} className="space-y-4">
        <label htmlFor="prompt" className="block font-semibold">
          どんなことを頼みたいですか？
        </label>
        <textarea
          id="prompt"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          required
          maxLength={5000}
          rows={5}
          placeholder="例：大切な人に贈る手作りのアクセサリーをお願いしたい"
          className="w-full rounded-xl border bg-background p-4"
        />
        <button
          disabled={busy}
          className="rounded-lg bg-primary px-6 py-3 text-white"
        >
          {busy ? "検索中…" : "AIに相談する"}
        </button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </form>
      {results && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">おすすめの出品</h2>
          {results.length ? (
            <ul className="mt-4 space-y-3">
              {results.map((result) => (
                <li key={result.listingId} className="rounded-xl border p-4">
                  <Link
                    className="font-semibold text-primary"
                    href={`/listings/${result.listingId}`}
                  >
                    出品の詳細を見る →
                  </Link>
                  <p className="mt-2 text-sm">{result.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">
              おすすめできる出品はまだありません。
            </p>
          )}
        </section>
      )}
    </div>
  )
}
