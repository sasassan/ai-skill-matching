import { AdminControl } from "@/components/admin-control"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getListings } from "@/lib/supabase-data"
export default async function Listings() {
  const listings = await getListings(await createServerSupabaseClient())
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">出品管理</h1>
      <div className="mt-8 space-y-3">
        {listings.map((listing) => (
          <article
            key={listing.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5"
          >
            <div>
              <h2 className="font-bold">{listing.title}</h2>
              <p className="text-sm text-muted-foreground">
                {listing.category?.name} / {listing.status}
              </p>
            </div>
            <AdminControl kind="listing" id={listing.id} />
          </article>
        ))}
        {!listings.length && <p>出品はまだありません。</p>}
      </div>
    </div>
  )
}
