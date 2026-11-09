import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  getBookings,
  getListings,
  getOrders,
  getReports,
  getUsers,
} from "@/lib/supabase-data"
export default async function Admin() {
  const db = await createServerSupabaseClient()
  const [users, listings, bookings, orders, reports] = await Promise.all([
    getUsers(db),
    getListings(db),
    getBookings(db),
    getOrders(db),
    getReports(db),
  ])
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">管理ダッシュボード</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["ユーザー", users.length, "/admin/users"],
          ["出品", listings.length, "/admin/listings"],
          ["予約", bookings.length, "/messages"],
          ["注文", orders.length, "/messages"],
          ["通報", reports.length, "/admin/reports"],
        ].map(([label, count, href]) => (
          <Link
            key={String(label)}
            href={String(href)}
            className="rounded-xl border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-bold">{count}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
