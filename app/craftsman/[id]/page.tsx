import Link from "next/link"
import { Star, MapPin, Wrench, Award, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { CraftsmanMap } from "@/components/craftsman-map"
import {
  getCraftsmanById,
  getUserById,
  getPortfolioForCraftsman,
  getReviewsForUser,
  getAverageCategoryScores,
} from "@/lib/demo-data"
import { ReviewStars } from "@/components/review-stars"

export default async function CraftsmanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const craftsman = getCraftsmanById(id)
  const user = craftsman ? getUserById(craftsman.userId) : undefined
  const portfolio = craftsman ? getPortfolioForCraftsman(craftsman.id) : []
  const reviews = craftsman ? getReviewsForUser(craftsman.userId) : []
  const categoryScores = craftsman
    ? getAverageCategoryScores(craftsman.userId)
    : undefined

  if (!craftsman || !user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">技能者が見つかりません</h1>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/request/r1/matches">
          <ArrowLeft className="mr-1 h-4 w-4" />
          マッチング一覧に戻る
        </Link>
      </Button>

      <Card className="rounded-2xl">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl">{user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="font-serif text-2xl font-bold">{user.name}</h1>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />{craftsman.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    {craftsman.rating}
                  </Badge>
                  <Badge variant="secondary">
                    レビュー {craftsman.reviewCount}件
                  </Badge>
                </div>
              </div>

              <p className="mt-4 leading-relaxed">{craftsman.bio}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {craftsman.skills.map((skill) => (
                  <Badge key={skill.id} variant="secondary">
                    {skill.name}
                  </Badge>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="gap-2">
                  <Link href="/request/new">
                    <Wrench className="h-4 w-4" />
                    この技能者に依頼する
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="#portfolio">ポートフォリオを見る</a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8 rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif">所在地・対応地域</CardTitle>
          </div>
          <CardDescription>
            所在地: {craftsman.location} / 対応地域:{" "}
            {craftsman.serviceAreas.join("・")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          <CraftsmanMap
            markers={[
              {
                id: craftsman.id,
                lat: craftsman.coordinates.lat,
                lng: craftsman.coordinates.lng,
                name: user.name,
                location: craftsman.location,
                rating: craftsman.rating,
              },
            ]}
            height={320}
          />
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">設備・機材</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {craftsman.equipment.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">こんなこともできます</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {craftsman.specialSkills.map((skill) => (
                <Badge key={skill} variant="outline">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-10" />

      <section>
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-bold">評価・レビュー</h2>
          <p className="mt-1 text-muted-foreground">
            {reviews.length > 0
              ? `${reviews.length}件のレビュー`
              : "まだレビューはありません"}
          </p>
        </div>
        {reviews.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="rounded-2xl lg:col-span-1">
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  総合評価
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <ReviewStars rating={craftsman.rating} size="lg" />
                  <span className="font-serif text-3xl font-bold">
                    {craftsman.rating.toFixed(1)}
                  </span>
                </div>
                {categoryScores && (
                  <div className="mt-4 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">品質</p>
                      <ReviewStars
                        rating={categoryScores.quality}
                        size="sm"
                        showValue
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        コミュニケーション
                      </p>
                      <ReviewStars
                        rating={categoryScores.communication}
                        size="sm"
                        showValue
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        納期遵守
                      </p>
                      <ReviewStars
                        rating={categoryScores.deadline}
                        size="sm"
                        showValue
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">コスパ</p>
                      <ReviewStars
                        rating={categoryScores.costPerformance}
                        size="sm"
                        showValue
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 lg:col-span-2">
              {reviews.map((review) => {
                const reviewer = getUserById(review.reviewerId)
                return (
                  <Card key={review.id} className="rounded-2xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-serif text-base">
                          {reviewer?.name ?? "依頼者"}
                        </CardTitle>
                        <ReviewStars
                          rating={review.rating}
                          size="sm"
                          showValue
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                      {review.photos && review.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {review.photos.map((photo, idx) => (
                            <img
                              key={idx}
                              src={photo}
                              alt={`レビュー写真 ${idx + 1}`}
                              className="h-20 w-20 rounded-xl object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            まだレビューが投稿されていません。
          </p>
        )}
      </section>

      <Separator className="my-10" />

      <section id="portfolio">
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-bold">ポートフォリオ</h2>
          <p className="mt-1 text-muted-foreground">
            これまでの制作実績をご紹介します。
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {portfolio.map((item) => (
            <Card key={item.id} className="overflow-hidden rounded-2xl">
              <img
                src={item.image}
                alt={item.title}
                className="aspect-video w-full object-cover"
              />
              <CardHeader className="pt-4">
                <CardTitle className="font-serif text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {portfolio.length === 0 && (
          <p className="text-muted-foreground">ポートフォリオはまだ登録されていません。</p>
        )}
      </section>
    </div>
  )
}
