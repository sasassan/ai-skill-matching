import Link from "next/link"
import { redirect } from "next/navigation"
import { ListingForm } from "@/components/listing-form"
import { getCategories, getProviderByUserId } from "@/lib/supabase-data"
import {
  createServerSupabaseClient,
  getServerProfile,
} from "@/lib/supabase-server"
export default async function NewListing() {
  const user = await getServerProfile().catch(() => null)
  if (!user) redirect("/login?next=%2Flistings%2Fnew")
  const db = await createServerSupabaseClient()
  const [provider, categories] = await Promise.all([
    getProviderByUserId(db, user.id),
    getCategories(db),
  ])
  if (!provider)
    return (
      <div className="container mx-auto p-12">
        出品には
        <Link href="/mypage?tab=provider" className="text-primary underline">
          提供者プロフィールの登録
        </Link>
        が必要です。
      </div>
    )
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">スキルを出品する</h1>
      <ListingForm
        categories={categories.filter((category) => category.isPublic)}
        userId={user.id}
      />
    </div>
  )
}
