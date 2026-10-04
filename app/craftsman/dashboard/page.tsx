import Link from "next/link"
import { TrendingUp, Star, Package, DollarSign, Briefcase } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  craftsmanProfiles,
  transactions,
  requests,
} from "@/lib/demo-data"

export default function CraftsmanDashboardPage() {
  const profile = craftsmanProfiles[0]
  const revenue = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const recommended = requests.filter((r) => r.status === "matching").slice(0, 3)

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">ダッシュボード</h1>
        <p className="mt-2 text-muted-foreground">
          今日の活動状況とおすすめ案件を確認できます。
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>今月の売上</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-bold">
              ¥{revenue.toLocaleString()}
            </p>
            <DollarSign className="mt-2 h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>平均評価</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-bold">{profile.rating}</p>
            <Star className="mt-2 h-4 w-4 fill-primary text-primary" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>累計受注数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-bold">
              {profile.completedOrders}
            </p>
            <Package className="mt-2 h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>レビュー数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-bold">
              {profile.reviewCount}
            </p>
            <TrendingUp className="mt-2 h-4 w-4 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif">売上推移</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end justify-between gap-2 rounded-xl bg-muted p-4">
              {[40, 60, 35, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>4月</span>
              <span>5月</span>
              <span>6月</span>
              <span>7月</span>
              <span>8月</span>
              <span>9月</span>
              <span>10月</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">おすすめ案件</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommended.map((req) => (
              <div key={req.id} className="rounded-xl border p-3">
                <p className="font-medium">{req.title}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(req.spec?.requiredSkills ?? []).slice(0, 2).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" asChild className="mt-3 w-full">
                  <Link href={`/craftsman/jobs/${req.id}`}>詳細を見る</Link>
                </Button>
              </div>
            ))}
            {recommended.length === 0 && (
              <p className="text-sm text-muted-foreground">おすすめ案件はありません。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
