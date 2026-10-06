import Link from "next/link"
import { ArrowRight, MessageCircle, Star } from "lucide-react"

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
import { getCraftsmanById, getUserById, craftsmanProfiles } from "@/lib/demo-data"
import { scoreMatching, type MatchingScore } from "@/lib/ai"

export default async function RequestMatchesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { getRequestById } = await import("@/lib/demo-data")
  const request = getRequestById(id)

  const spec = request?.spec ?? {
    title: request?.title ?? "依頼",
    category: "未分類",
    summary: request?.description ?? "",
    requiredSkills: [],
    materials: [],
    budget: "-",
    deadline: "-",
    notes: "",
  }

  const craftsmanIds = craftsmanProfiles.map((p) => p.id)
  const scores = await scoreMatching(spec, craftsmanIds)
  const matches = scores
    .map((score) => {
      const craftsman = getCraftsmanById(score.craftsmanId)
      const user = craftsman ? getUserById(craftsman.userId) : undefined
      return craftsman && user ? { score, craftsman, user } : null
    })
    .filter(Boolean) as {
    score: MatchingScore
    craftsman: NonNullable<ReturnType<typeof getCraftsmanById>>
    user: { name: string; avatar: string }
  }[]

  matches.sort((a, b) => b.score.score - a.score.score)

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">マッチング結果</p>
        <h1 className="font-serif text-2xl font-bold">AIおすすめ技能者</h1>
        <p className="mt-2 text-muted-foreground">
          必要技能・実績・地域から最適な技能者をスコアリングしました。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {matches.map(({ score, craftsman, user }) => {
          return (
            <Card key={score.craftsmanId} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="font-serif text-base">{user.name}</CardTitle>
                      <CardDescription>{craftsman.location}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">
                    マッチ度 {score.score}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{craftsman.bio}</p>

                <div className="rounded-xl border bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">AIマッチ理由</p>
                  <p className="mt-1 text-sm">{score.reason}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {craftsman.skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary">
                      {skill.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {craftsman.rating}
                  </span>
                  <span>レビュー {craftsman.reviewCount}件</span>
                  <span>実績 {craftsman.completedOrders}件</span>
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Button variant="outline" size="sm" asChild className="sm:flex-1">
                    <Link href={`/craftsman/${craftsman.id}`}>
                      プロフィール
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="gap-1 sm:flex-1">
                    <Link href={`/request/${id}/messages`}>
                      <MessageCircle className="h-4 w-4" />
                      相談する
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {matches.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            マッチング候補がまだありません。
          </CardContent>
        </Card>
      )}
    </div>
  )
}
