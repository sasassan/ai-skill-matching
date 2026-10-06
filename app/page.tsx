import Link from "next/link"
import { ArrowRight, Sparkles, Shield, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { craftsmanProfiles, getUserById } from "@/lib/demo-data"

export default function Page() {
  const featured = craftsmanProfiles.slice(0, 2)

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-medium text-primary">
              AIスキルマッチングマーケットプレイス
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
              作りたいと、できるをつなぐ。
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              車両内装カスタムから着脱式収納まで、あなたの作りたいをAIとコンシェルジュが最適な技能者とマッチングします。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/request/new">
                  無料で依頼を作成
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/craftsmen">技能者を探す</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/craftsman/jobs">技能者の方はこちら</Link>
              </Button>
            </div>
          </div>

          {/* Natural language input card */}
          <div className="mx-auto mt-14 max-w-2xl">
            <Card className="rounded-2xl">
              <CardContent className="p-6 md:p-8">
                <label
                  htmlFor="hero-request"
                  className="mb-3 block font-serif text-lg font-medium"
                >
                  まずは作りたいことを自然語で入力
                </label>
                <textarea
                  id="hero-request"
                  rows={3}
                  placeholder="例：アルファードの3列目シート下に、キャンプ道具と子供用品を分けられる着脱式収納ボックスが欲しい..."
                  className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring placeholder:text-muted-foreground focus-visible:ring-1"
                />
                <div className="mt-4 flex items-center justify-end">
                  <Button asChild className="gap-2">
                    <Link href="/request/new">
                      <Sparkles className="h-4 w-4" />
                      AIで仕様化する
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-2xl font-bold md:text-3xl">
            3つの強み
          </h2>
          <p className="mt-3 text-muted-foreground">
            AI＋職人ネットワークで、理想のモノづくりを加速します。
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-xl">
            <CardHeader>
              <Sparkles className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="font-serif">AIが仕様を整理</CardTitle>
              <CardDescription>
                曖昧な要望でも、AIが必要技能・素材・予算感を整理した仕様書に変換します。
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-xl">
            <CardHeader>
              <Shield className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="font-serif">信頼の技能者マッチング</CardTitle>
              <CardDescription>
                実績・レビュー・設備から、最適な技能者をAIがスコアリングして提案します。
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-xl">
            <CardHeader>
              <MessageCircle className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="font-serif">安心のやり取り・決済</CardTitle>
              <CardDescription>
                チャットで相談、見積り、納品までをアプリ内で一元管理できます。
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Featured craftsmen */}
      <section className="bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-2xl font-bold md:text-3xl">
              注目の技能者
            </h2>
            <p className="mt-3 text-muted-foreground">
              高い評価と実績を持つ職人をご紹介します。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {featured.map((craftsman) => {
              const user = getUserById(craftsman.userId)
              return (
                <Card key={craftsman.id} className="rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback>{user?.name?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-serif text-lg font-bold">
                            {user?.name}
                          </h3>
                          <Badge variant="secondary">
                            ★ {craftsman.rating}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {craftsman.location}
                        </p>
                        <p className="mt-3 line-clamp-2 text-sm">{craftsman.bio}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {craftsman.skills.map((skill) => (
                            <Badge key={skill.id} variant="outline">
                              {skill.name}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-5">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/craftsman/${craftsman.id}`}>
                              プロフィールを見る
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
