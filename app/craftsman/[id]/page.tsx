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
import {
  getCraftsmanById,
  getUserById,
  getPortfolioForCraftsman,
} from "@/lib/demo-data"

export default async function CraftsmanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const craftsman = getCraftsmanById(id)
  const user = craftsman ? getUserById(craftsman.userId) : undefined
  const portfolio = craftsman ? getPortfolioForCraftsman(craftsman.id) : []

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
