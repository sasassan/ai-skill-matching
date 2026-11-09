import { AdminControl } from "@/components/admin-control"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getCategories } from "@/lib/supabase-data"
export default async function Categories() {
  const categories = await getCategories(await createServerSupabaseClient())
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">カテゴリ管理</h1>
      <div className="mt-8 space-y-3">
        {categories.map((category) => (
          <article
            key={category.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5"
          >
            <div>
              <h2 className="font-bold">{category.name}</h2>
              <p className="text-sm text-muted-foreground">
                {category.isPublic ? "公開中" : "非公開"}
              </p>
            </div>
            <AdminControl
              kind="category"
              id={category.id}
              visible={category.isPublic}
            />
          </article>
        ))}
        {!categories.length && <p>カテゴリはまだありません。</p>}
      </div>
    </div>
  )
}
