import Link from "next/link"
import { notFound } from "next/navigation"
import { FavoriteButton } from "@/components/favorite-button"
import { ReportForm } from "@/components/report-form"
import { listingPrice } from "@/components/listing-card"
import {
  getCraftsmanById,
  getFavoriteListingIds,
  getListingById,
  getReviewsForUser,
} from "@/lib/supabase-data"
import {
  createServerSupabaseClient,
  getServerProfile,
} from "@/lib/supabase-server"
import { stripeUnavailableMessage } from "@/lib/stripe"

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = await createServerSupabaseClient()
  const listing = await getListingById(db, id)
  if (!listing || listing.status !== "published") notFound()
  const [provider, user] = await Promise.all([
    getCraftsmanById(db, listing.providerId),
    getServerProfile(),
  ])
  const [reviews, favorites] = await Promise.all([
    provider ? getReviewsForUser(db, provider.userId) : Promise.resolve([]),
    user ? getFavoriteListingIds(db, user.id) : Promise.resolve([] as string[]),
  ])
  return (
    <div className="container mx-auto max-w-6xl px-4 py-14">
      <p className="text-sm text-primary">
        {listing.category?.name} /{" "}
        {listing.fulfillmentType === "booking" ? "予約" : "制作・納品"}
      </p>
      <h1 className="mt-3 text-3xl font-bold">{listing.title}</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="grid grid-cols-2 gap-3">
            {listing.images?.length ? (
              listing.images
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={listing.title}
                    className="aspect-[4/3] w-full rounded-xl object-cover"
                  />
                ))
            ) : (
              <div className="col-span-2 flex aspect-video items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                画像はまだありません
              </div>
            )}
          </div>
          <h2 className="mt-10 text-xl font-bold">サービスについて</h2>
          <p className="mt-4 leading-8 whitespace-pre-wrap">
            {listing.description}
          </p>
          <h2 className="mt-10 text-xl font-bold">レビュー</h2>
          {reviews.length ? (
            <div className="mt-4 space-y-4">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border bg-card p-5"
                >
                  <p className="text-primary">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{review.comment}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground">
              レビューはまだありません。
            </p>
          )}
        </div>
        <aside className="h-fit space-y-5 rounded-2xl border bg-card p-6">
          <p className="text-2xl font-bold">{listingPrice(listing)}</p>
          <p className="text-sm text-muted-foreground">
            エリア:{" "}
            {listing.location || listing.serviceAreas.join("、") || "要相談"}
          </p>
          {provider && (
            <Link
              href={`/providers/${provider.id}`}
              className="block border-t pt-5 font-semibold"
            >
              提供者: {provider.name} →
            </Link>
          )}
          <Link
            href={`/listings/${listing.id}/${listing.fulfillmentType === "booking" ? "book" : "contact"}`}
            className="block rounded-lg bg-primary px-4 py-3 text-center font-semibold text-white"
          >
            {listing.fulfillmentType === "booking"
              ? "予約を申し込む"
              : "制作を相談する"}
          </Link>
          <FavoriteButton
            listingId={listing.id}
            initialFavorite={favorites.includes(listing.id)}
            loggedIn={Boolean(user)}
          />
          <ReportForm listingId={listing.id} loggedIn={Boolean(user)} />
          <p className="text-xs leading-6 text-muted-foreground">
            {stripeUnavailableMessage}
          </p>
        </aside>
      </div>
    </div>
  )
}
