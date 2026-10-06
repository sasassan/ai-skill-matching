"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, MapPin, Star, Wrench, Package, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CraftsmanMap } from "@/components/craftsman-map"
import { craftsmanProfiles, getUserById } from "@/lib/demo-data"
import {
  DEFAULT_FILTERS,
  getSearchOptions,
  searchCraftsmen,
  type SearchFilters,
} from "@/lib/search"

const ratingOptions = [
  { value: "all", label: "すべて" },
  { value: "4.0", label: "4.0以上" },
  { value: "4.5", label: "4.5以上" },
]

const budgetOptions = [
  { value: "all", label: "すべて" },
  { value: "6000", label: "〜6,000円/時" },
  { value: "8000", label: "〜8,000円/時" },
  { value: "10000", label: "〜10,000円/時" },
]

export default function CraftsmenSearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const options = useMemo(() => getSearchOptions(craftsmanProfiles), [])

  const results = useMemo(
    () => searchCraftsmen(craftsmanProfiles, filters),
    [filters],
  )

  const markers = results.map((craftsman) => {
    const user = getUserById(craftsman.userId)
    return {
      id: craftsman.id,
      lat: craftsman.coordinates.lat,
      lng: craftsman.coordinates.lng,
      name: user?.name ?? craftsman.id,
      location: craftsman.location,
      rating: craftsman.rating,
      href: `/craftsman/${craftsman.id}`,
    }
  })

  const update = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const reset = () => setFilters(DEFAULT_FILTERS)

  const activeFilterCount = [
    filters.prefecture,
    filters.category,
    filters.material,
    filters.minRating,
    filters.maxHourlyRate,
  ].filter((value) => value !== "all" && value !== 0 && value !== null).length

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">技能者を探す</p>
        <h1 className="font-serif text-2xl font-bold md:text-3xl">
          あなたの作りたいを叶える技能者
        </h1>
        <p className="mt-2 text-muted-foreground">
          キーワード・依頼内容・地域・素材・設備から最適な技能者を探せます。
        </p>
      </div>

      {/* Search & free-text request */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="技能・素材・設備・地域などでキーワード検索（例：レザー、木工、東京都）"
              value={filters.query}
              onChange={(e) => update("query", e.target.value)}
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="free-text"
              className="text-sm font-medium text-muted-foreground"
            >
              依頼内容をそのまま入力して絞り込む
            </label>
            <Textarea
              id="free-text"
              rows={2}
              placeholder="例：アルファードのシートを本革で張り替えたい..."
              value={filters.freeText}
              onChange={(e) => update("freeText", e.target.value)}
              className="resize-none rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-base">絞り込み</CardTitle>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="h-7 gap-1 text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    リセット
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterField label="地域">
                <Select
                  value={filters.prefecture}
                  onValueChange={(value) => update("prefecture", value ?? "all")}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="すべての地域" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての地域</SelectItem>
                    {options.prefectures.map((pref) => (
                      <SelectItem key={pref} value={pref}>
                        {pref}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="技能カテゴリ">
                <Select
                  value={filters.category}
                  onValueChange={(value) => update("category", value ?? "all")}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="すべてのカテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのカテゴリ</SelectItem>
                    {options.categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="対応素材">
                <Select
                  value={filters.material}
                  onValueChange={(value) => update("material", value ?? "all")}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="すべての素材" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての素材</SelectItem>
                    {options.materials.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="評価">
                <Select
                  value={filters.minRating === 0 ? "all" : String(filters.minRating)}
                  onValueChange={(value) =>
                    update(
                      "minRating",
                      value === "all" || value === null ? 0 : Number(value),
                    )
                  }
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="予算帯（時給）">
                <Select
                  value={
                    filters.maxHourlyRate === null
                      ? "all"
                      : String(filters.maxHourlyRate)
                  }
                  onValueChange={(value) =>
                    update(
                      "maxHourlyRate",
                      value === "all" || value === null
                        ? null
                        : Number(value),
                    )
                  }
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </CardContent>
          </Card>
        </aside>

        {/* Results */}
        <section className="space-y-6">
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="font-serif text-base">
                  対応地域マップ
                </CardTitle>
              </div>
              <CardDescription>
                ピンをクリックすると技能者の詳細が表示されます。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <CraftsmanMap markers={markers} height={320} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {results.length}
              </span>{" "}
              件の技能者が見つかりました
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {results.map((craftsman) => {
              const user = getUserById(craftsman.userId)
              return (
                <Card key={craftsman.id} className="rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback>
                          {user?.name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="truncate font-serif text-base font-bold">
                            {user?.name}
                          </h2>
                          <Badge
                            variant="default"
                            className="shrink-0 gap-1 text-xs"
                          >
                            <Star className="h-3 w-3 fill-current" />
                            {craftsman.rating}
                          </Badge>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {craftsman.location}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm">
                          {craftsman.bio}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {craftsman.skills.map((skill) => (
                        <Badge key={skill.id} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {craftsman.materials.slice(0, 3).join("・")}
                        {craftsman.materials.length > 3 ? " ほか" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3.5 w-3.5" />
                        {craftsman.hourlyRate?.toLocaleString("ja-JP") ?? "相談"}円/時
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="mt-4 w-full"
                    >
                      <Link href={`/craftsman/${craftsman.id}`}>
                        プロフィールを見る
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {results.length === 0 && (
            <Card className="rounded-2xl">
              <CardContent className="py-16 text-center text-muted-foreground">
                条件に合う技能者が見つかりません。絞り込み条件を変更してください。
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
