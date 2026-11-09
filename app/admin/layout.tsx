import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerProfile } from "@/lib/supabase-server"
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerProfile().catch(() => null)
  if (!user) redirect("/login?next=%2Fadmin")
  if (user.role !== "admin") redirect("/")
  return (
    <>
      <nav
        aria-label="管理メニュー"
        className="container mx-auto flex flex-wrap gap-4 px-4 pt-8 text-sm text-primary"
      >
        {[
          ["/admin", "概要"],
          ["/admin/users", "ユーザー"],
          ["/admin/listings", "出品"],
          ["/admin/reports", "通報"],
          ["/admin/categories", "カテゴリ"],
          ["/admin/verifications", "資格確認"],
        ].map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  )
}
