import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"
import {
  createServerSupabaseClient,
  getServerProfile,
} from "@/lib/supabase-server"
import {
  getBookings,
  getOrders,
  getProviderByUserId,
} from "@/lib/supabase-data"
export default async function Messages() {
  const user = await getServerProfile().catch(() => null)
  if (!user)
    return (
      <div className="container mx-auto px-4 py-16">
        <Link className="text-primary underline" href="/login?next=%2Fmessages">
          ログイン
        </Link>
        してメッセージを確認してください。
      </div>
    )
  const db = await createServerSupabaseClient()
  const [allBookings, allOrders, provider] = await Promise.all([
    getBookings(db),
    getOrders(db),
    getProviderByUserId(db, user.id),
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
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">メッセージ</h1>
      <p className="mt-3 text-muted-foreground">
        取引を選択してメッセージを確認できます。
      </p>
      <div className="mt-8 space-y-3">
        {bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/bookings/${booking.id}`}
            className="flex justify-between rounded-xl border bg-card p-5"
          >
            <span>
              予約: {new Date(booking.scheduledStart).toLocaleString("ja-JP")}
            </span>
            <StatusBadge status={booking.status} />
          </Link>
        ))}
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex justify-between rounded-xl border bg-card p-5"
          >
            <span>{order.title}</span>
            <StatusBadge status={order.status} />
          </Link>
        ))}
        {!bookings.length && !orders.length && (
          <p className="text-muted-foreground">取引はまだありません。</p>
        )}
      </div>
    </div>
  )
}
