import { notFound, redirect } from "next/navigation"
import { ListingForm } from "@/components/listing-form"
import {
  getCategories,
  getListingById,
  getProviderByUserId,
} from "@/lib/supabase-data"
import {
  createServerSupabaseClient,
  getServerProfile,
} from "@/lib/supabase-server"
export default async function EditListing({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ image_failed?: string }>
}) {
  const { id } = await params
  const user = await getServerProfile().catch(() => null)
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listings/${id}/edit`)}`)
  const db = await createServerSupabaseClient()
  const [provider, categories, listing] = await Promise.all([
    getProviderByUserId(db, user.id),
    getCategories(db),
    getListingById(db, id),
  ])
  if (!listing || !provider || listing.providerId !== provider.id) notFound()
  const query = await searchParams
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">出品を編集する</h1>
      {query.image_failed && (
        <p role="alert" className="mb-4 text-destructive">
          出品は保存されましたが画像の追加に失敗しました。再度お試しください。
        </p>
      )}
      <ListingForm
        listing={listing}
        categories={categories.filter(
          (category) => category.isPublic || category.id === listing.categoryId
        )}
        userId={user.id}
      />
    </div>
  )
}
