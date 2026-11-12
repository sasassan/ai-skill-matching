import Link from "next/link"
import { AccountForm } from "@/components/account-form"
import { ListingCard } from "@/components/listing-card"
import { ProviderProfileForm } from "@/components/provider-profile-form"
import { PayoutDashboard } from "@/components/payout-dashboard"
import { getBalance, stripePaymentEnabled } from "@/lib/stripe"
import { VerificationForm } from "@/components/verification-form"
import { StatusBadge } from "@/components/status-badge"
import {
  createServerSupabaseClient,
  getServerProfile,
} from "@/lib/supabase-server"
import {
  getBookings,
  getCategories,
  getFavoriteListingIds,
  getListings,
  getOrders,
  getProviderByUserId,
  getProviderVerifications,
} from "@/lib/supabase-data"

const tabs = [
  ["profile", "プロフィール"],
  ["provider", "提供者プロフィール"],
  ["listings", "出品管理"],
  ["bookings", "予約管理"],
  ["orders", "注文管理"],
  ["favorites", "お気に入り"],
  ["verifications", "資格申請"],
]
export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await getServerProfile().catch(() => null)
  if (!user)
    return (
      <div className="container mx-auto px-4 py-16">
        <Link href="/login?next=%2Fmypage" className="text-primary underline">
          ログイン
        </Link>
        してマイページをご利用ください。
      </div>
    )
  const db = await createServerSupabaseClient()
  const [
    provider,
    listings,
    allBookings,
    allOrders,
    favorites,
    categories,
    verifications,
  ] = await Promise.all([
    getProviderByUserId(db, user.id),
    getListings(db),
    getBookings(db),
    getOrders(db),
    getFavoriteListingIds(db, user.id),
    getCategories(db),
    getProviderVerifications(db),
  ])
  const bookings = allBookings.filter(
    (booking) =>
      booking.customerId === user.id || booking.providerUserId === user.id
  )
  const orders = allOrders.filter(
    (order) =>
      order.customerId === user.id ||
      (provider && order.providerProfileId === provider.id)
  )
  const tab = (await searchParams).tab ?? "profile"
  let payoutData = { connected: false, revenue: 0, pending: 0, paid: 0, available: null as number | null }
  if (provider && stripePaymentEnabled && (tab === "payouts" || tab === "provider")) {
    const [account, payments, payouts] = await Promise.all([
      db.from("provider_profiles").select("stripe_account_id,stripe_onboarding_completed").eq("id", provider.id).single(),
      db.from("payments").select("amount,platform_fee,status").eq("provider_id", provider.id),
      db.from("payouts").select("amount,status").eq("provider_id", provider.id),
    ])
    if (account.error || payments.error || payouts.error) throw new Error("売上情報を読み込めませんでした。")
    let available: number | null = null
    if (account.data.stripe_account_id && account.data.stripe_onboarding_completed) {
      try { available = (await getBalance(account.data.stripe_account_id)).available.find((item) => item.currency === "jpy")?.amount ?? 0 } catch { available = null }
    }
    const paidPayments = payments.data.filter((item) => ["captured", "transferring", "transferred"].includes(item.status))
    payoutData = {
      connected: account.data.stripe_onboarding_completed,
      revenue: paidPayments.reduce((total, item) => total + item.amount - item.platform_fee, 0),
      pending: paidPayments.filter((item) => item.status !== "transferred").reduce((total, item) => total + item.amount - item.platform_fee, 0),
      paid: payouts.data.filter((item) => item.status === "completed").reduce((total, item) => total + item.amount, 0),
      available,
    }
  }
  const visibleTabs = provider ? [...tabs, ["payouts", "売上・振込"]] : tabs
  const ownListings = listings.filter(
    (listing) => listing.providerId === provider?.id
  )
  return (
    <div className="container mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-3xl font-bold">マイページ</h1>
      <nav aria-label="マイページ" className="my-8 flex flex-wrap gap-2">
        {visibleTabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/mypage?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm ${tab === key ? "bg-primary text-white" : "bg-secondary"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="rounded-2xl border bg-card p-6">
        {tab === "profile" && (
          <AccountForm name={user.name} email={user.email} />
        )}
        {tab === "provider" && <><ProviderProfileForm provider={provider} />{provider && <div className="mt-8 border-t pt-6"><PayoutDashboard enabled={stripePaymentEnabled} {...payoutData} /></div>}</>}
        {tab === "payouts" && provider && <PayoutDashboard enabled={stripePaymentEnabled} {...payoutData} />}
        {tab === "listings" && (
          <div>
            <Link
              href="/listings/new"
              className="inline-block rounded-lg bg-primary px-5 py-2 text-white"
            >
              新しく出品
            </Link>
            <div className="mt-5 space-y-3">
              {ownListings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <span>
                    {listing.title}（{listing.status}）
                  </span>
                  <Link
                    className="text-primary underline"
                    href={`/listings/${listing.id}/edit`}
                  >
                    編集
                  </Link>
                </div>
              ))}
              {!ownListings.length && <p>出品はまだありません。</p>}
            </div>
          </div>
        )}
        {tab === "bookings" && (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="flex justify-between rounded-lg border p-4"
              >
                <span>
                  {new Date(booking.scheduledStart).toLocaleString("ja-JP")}
                </span>
                <StatusBadge status={booking.status} />
              </Link>
            ))}
            {!bookings.length && <p>予約はまだありません。</p>}
          </div>
        )}
        {tab === "orders" && (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex justify-between rounded-lg border p-4"
              >
                <span>{order.title}</span>
                <StatusBadge status={order.status} />
              </Link>
            ))}
            {!orders.length && <p>注文はまだありません。</p>}
          </div>
        )}
        {tab === "favorites" &&
          (favorites.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {listings
                .filter(
                  (listing) =>
                    favorites.includes(listing.id) &&
                    listing.status === "published" &&
                    listing.category?.isPublic
                )
                .map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
            </div>
          ) : (
            <p>お気に入りはまだありません。</p>
          ))}
        {tab === "verifications" && (
          <div>
            <VerificationForm
              categories={categories.filter((category) => category.isPublic)}
              userId={user.id}
            />
            <div className="mt-8 space-y-2">
              {verifications
                .filter((item) => item.providerUserId === user.id)
                .map((item) => (
                  <p key={item.id}>
                    {item.name}：
                    {item.status === "approved"
                      ? "承認済み"
                      : item.status === "pending"
                        ? "審査中"
                        : item.status === "rejected"
                          ? "却下"
                          : "未提出"}
                  </p>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
