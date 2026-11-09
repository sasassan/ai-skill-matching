import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { ListingCard } from "@/components/listing-card"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getCategories, getListings } from "@/lib/supabase-data"

export default async function HomePage() {
  const data = await createServerSupabaseClient()
    .then(async (db) => ({
      categories: await getCategories(db),
      listings: await getListings(db),
      unavailable: false,
    }))
    .catch(() => ({ categories: [], listings: [], unavailable: true }))
  const categories = data.categories.filter((category) => category.isPublic)
  const listings = data.listings
    .filter(
      (listing) => listing.status === "published" && listing.category?.isPublic
    )
    .slice(0, 4)
  return (
    <div>
      <section className="relative overflow-hidden border-b bg-[#eee7dc]">
        <div className="container mx-auto grid min-h-[480px] items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <p className="mb-5 text-xs font-bold tracking-[0.25em] text-primary">
              SKILLS FOR A BETTER EVERYDAY
            </p>
            <h1 className="font-serif text-4xl leading-[1.4] font-bold md:text-5xl">
              得意なことが、
              <br />
              誰かのうれしいに。
            </h1>
            <p className="mt-6 max-w-lg leading-8 text-muted-foreground">
              趣味も、経験も、磨いてきた技術も。
              <br />
              あなたにぴったりのスキルと出会う場所。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white"
              >
                スキルを探す <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/providers/guide"
                className="rounded-full border border-foreground/25 px-7 py-3 text-sm font-semibold"
              >
                スキルを提供する
              </Link>
            </div>
          </div>
          <div
            aria-hidden
            className="hidden h-80 rounded-[45%_45%_8%_8%] bg-gradient-to-br from-[#d5ad88] via-[#c98c5f] to-[#8e6d55] md:block"
          >
            <div className="flex h-full items-center justify-center font-serif text-8xl text-white/30">
              手
            </div>
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-primary">
              EXPLORE
            </p>
            <h2 className="mt-3 text-3xl font-bold">カテゴリから探す</h2>
          </div>
          <Link href="/search" className="text-sm text-primary">
            すべて見る →
          </Link>
        </div>
        {categories.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/search?category=${encodeURIComponent(category.id)}`}
                className="rounded-xl border bg-card p-6 hover:border-primary"
              >
                <span className="text-lg font-semibold">{category.name}</span>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {category.description}
                </p>
              </Link>
            ))}
          </div>
        ) : data.unavailable ? (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              カテゴリ情報を読み込めませんでした。以下は検索キーワードの例です。
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {["ハンドメイド", "レッスン", "デザイン", "美容"].map((name) => (
                <Link
                  key={name}
                  href={`/search?q=${encodeURIComponent(name)}`}
                  className="rounded-xl border bg-card p-6 font-semibold hover:border-primary"
                >
                  {name} →
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-card p-6 text-muted-foreground">
            公開中のカテゴリはまだありません。
          </p>
        )}
      </section>
      <section className="bg-[#f0ebe3] py-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-primary">
                DISCOVER
              </p>
              <h2 className="mt-3 text-3xl font-bold">
                新しい出会いを見つける
              </h2>
            </div>
            <Link href="/search" className="text-sm text-primary">
              出品を探す →
            </Link>
          </div>
          {listings.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {data.unavailable
                ? "出品情報を読み込めませんでした。"
                : "出品はまだありません。"}
            </p>
          )}
        </div>
      </section>
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-3xl bg-[#243446] p-8 text-white md:flex md:items-center md:justify-between md:p-12">
          <div>
            <Sparkles className="mb-4 h-6 w-6 text-[#e8b88f]" />
            <h2 className="text-2xl font-bold">
              何を頼めばいいか、まだ曖昧でも。
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/70">
              やりたいことを言葉にして、AIに相談してみましょう。
            </p>
          </div>
          <Link
            href="/orders/new"
            className="mt-6 inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#243446] md:mt-0"
          >
            AIに相談する →
          </Link>
        </div>
      </section>
    </div>
  )
}
