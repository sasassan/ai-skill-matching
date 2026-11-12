import { notFound, redirect } from "next/navigation"
import { TradeRequestForm } from "@/components/trade-request-form"
import {
  createServerSupabaseClient,
  getServerProfile,
} from "@/lib/supabase-server"
import { getListingById } from "@/lib/supabase-data"
import { stripePaymentEnabled, stripeUnavailableMessage } from "@/lib/stripe"
export default async function Book({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerProfile().catch(() => null)
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listings/${id}/book`)}`)
  const listing = await getListingById(await createServerSupabaseClient(), id)
  if (
    !listing ||
    listing.status !== "published" ||
    listing.fulfillmentType !== "booking"
  )
    notFound()
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold">予約を申し込む</h1>
      <p className="mb-6">{listing.title}</p>
      <TradeRequestForm listing={listing} />
      <p className="mt-5 text-sm text-muted-foreground">
        {stripePaymentEnabled ? "予約承認後に取引詳細からお支払いください。" : stripeUnavailableMessage}
      </p>
    </div>
  )
}
