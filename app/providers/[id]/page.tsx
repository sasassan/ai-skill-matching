import { notFound } from "next/navigation"
import { ListingCard } from "@/components/listing-card"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  getCraftsmanById,
  getListings,
  getPortfolioItems,
  getProviderVerifiedCategories,
  getReviewsForUser,
  getCategories,
} from "@/lib/supabase-data"

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = await createServerSupabaseClient()
  const provider = await getCraftsmanById(db, id)
  if (!provider) notFound()
  const [listings, portfolio, reviews, verified, categories] =
    await Promise.all([
      getListings(db),
      getPortfolioItems(db, id),
      getReviewsForUser(db, provider.userId),
      getProviderVerifiedCategories(db, provider.userId),
      getCategories(db),
    ])
  const visibleListings = listings.filter(
    (listing) =>
      listing.providerId === id &&
      listing.status === "published" &&
      listing.category?.isPublic
  )
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16">
      <p className="text-sm text-primary">PROVIDER PROFILE</p>
      <h1 className="mt-3 text-4xl font-bold">{provider.name}</h1>
      <p className="mt-3 text-muted-foreground">
        {provider.location || provider.prefecture || "所在地は未登録"}
      </p>
      <p className="mt-6 leading-8 whitespace-pre-wrap">
        {provider.bio || "プロフィールはまだありません。"}
      </p>
      {verified.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {categories
            .filter((category) => verified.includes(category.id))
            .map((category) => (
              <span
                key={category.id}
                className="rounded-full bg-secondary px-3 py-1 text-sm"
              >
                {category.name} 資格確認済み
              </span>
            ))}
        </div>
      )}
      <section className="mt-14">
        <h2 className="text-2xl font-bold">出品</h2>
        {visibleListings.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleListings.map((listing) => (
              <ListingCard listing={listing} key={listing.id} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">出品はまだありません。</p>
        )}
      </section>
      <section className="mt-14">
        <h2 className="text-2xl font-bold">ポートフォリオ</h2>
        {portfolio.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {portfolio.map((item) => (
              <article key={item.id} className="rounded-xl border bg-card p-5">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="mb-4 aspect-video w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm">{item.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">
            ポートフォリオはまだありません。
          </p>
        )}
      </section>
      <section className="mt-14">
        <h2 className="text-2xl font-bold">レビュー</h2>
        {reviews.length ? (
          <div className="mt-5 space-y-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-xl border bg-card p-5"
              >
                <p className="text-primary">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
                <p className="mt-2">{review.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">
            レビューはまだありません。
          </p>
        )}
      </section>
    </div>
  )
}
