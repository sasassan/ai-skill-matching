import { ListingCard } from "@/components/listing-card"
import { searchListings } from "@/lib/search"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getCategories, getListings } from "@/lib/supabase-data"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : ""
  const number = (key: string) =>
    value(key) && Number.isFinite(Number(value(key))) && Number(value(key)) >= 0
      ? Number(value(key))
      : undefined
  const type =
    value("type") === "booking" || value("type") === "order"
      ? (value("type") as "booking" | "order")
      : undefined
  const db = await createServerSupabaseClient().catch(() => null)
  const [categories, listings] = db
    ? await Promise.all([getCategories(db), getListings(db)]).catch(
        () =>
          [[], []] as [
            Awaited<ReturnType<typeof getCategories>>,
            Awaited<ReturnType<typeof getListings>>,
          ]
      )
    : [[], []]
  const results = searchListings(listings, {
    keyword: value("q"),
    categoryId: value("category"),
    fulfillmentType: type,
    area: value("area"),
    minPrice: number("min"),
    maxPrice: number("max"),
  })
  const input = "w-full rounded-lg border bg-background px-3 py-2"
  return (
    <div className="container mx-auto px-4 py-14">
      <p className="text-xs font-bold tracking-[0.2em] text-primary">
        FIND YOUR SKILL
      </p>
      <h1 className="mt-3 text-3xl font-bold">スキルを探す</h1>
      <p className="mt-3 text-muted-foreground">
        あなたの暮らしや挑戦に合うスキルを見つけましょう。
      </p>
      <form className="my-8 grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-sm">
          キーワード
          <input className={input} name="q" defaultValue={value("q")} />
        </label>
        <label className="text-sm">
          カテゴリ
          <select
            className={input}
            name="category"
            defaultValue={value("category")}
          >
            <option value="">すべて</option>
            {categories
              .filter((category) => category.isPublic)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          方式
          <select className={input} name="type" defaultValue={value("type")}>
            <option value="">すべて</option>
            <option value="booking">予約</option>
            <option value="order">制作・納品</option>
          </select>
        </label>
        <label className="text-sm">
          エリア
          <input className={input} name="area" defaultValue={value("area")} />
        </label>
        <label className="text-sm">
          最低価格
          <input
            className={input}
            name="min"
            type="number"
            min="0"
            defaultValue={value("min")}
          />
        </label>
        <label className="text-sm">
          最高価格
          <input
            className={input}
            name="max"
            type="number"
            min="0"
            defaultValue={value("max")}
          />
        </label>
        <button className="rounded-lg bg-primary px-5 py-2 text-white">
          検索
        </button>
      </form>
      <p className="mb-5 text-sm text-muted-foreground">
        {results.length}件の出品
      </p>
      {results.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-muted-foreground">
          条件に合う出品はまだありません。
        </p>
      )}
    </div>
  )
}
