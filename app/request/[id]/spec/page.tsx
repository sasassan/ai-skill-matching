import Link from "next/link"
import { ArrowRight, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { getRequestById } from "@/lib/demo-data"

export default async function RequestSpecPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const request = getRequestById(id)

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">依頼が見つかりません</h1>
      </div>
    )
  }

  const spec = request.spec ?? {
    title: request.title,
    category: "未分類",
    summary: request.description,
    requiredSkills: [],
    materials: [],
    budget: "-",
    deadline: "-",
    notes: "",
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">AIが生成した仕様書</p>
          <h1 className="font-serif text-2xl font-bold">{spec.title}</h1>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif">仕様詳細</CardTitle>
          </div>
          <CardDescription>
            内容を確認・編集してからマッチング候補を探しましょう。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                defaultValue={spec.title}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">カテゴリ</Label>
              <Input
                id="category"
                defaultValue={spec.category}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">要約</Label>
            <Textarea
              id="summary"
              rows={3}
              defaultValue={spec.summary}
              className="resize-none rounded-xl"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>必要技能</Label>
              <div className="flex flex-wrap gap-2">
                {spec.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
                {spec.requiredSkills.length === 0 && (
                  <p className="text-sm text-muted-foreground">未設定</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>素材・部材</Label>
              <div className="flex flex-wrap gap-2">
                {spec.materials.map((material) => (
                  <Badge key={material} variant="outline">{material}</Badge>
                ))}
                {spec.materials.length === 0 && (
                  <p className="text-sm text-muted-foreground">未設定</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">予算</Label>
              <Input
                id="budget"
                defaultValue={spec.budget}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">納期</Label>
              <Input
                id="deadline"
                defaultValue={spec.deadline}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">備考・要望</Label>
            <Textarea
              id="notes"
              rows={3}
              defaultValue={spec.notes}
              className="resize-none rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button variant="outline" className="sm:flex-1">
              仕様を保存
            </Button>
            <Button asChild className="gap-2 sm:flex-1">
              <Link href={`/request/${id}/matches`}>
                マッチング候補を見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
