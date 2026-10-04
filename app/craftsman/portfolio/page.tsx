"use client"

import { useState } from "react"
import { Plus, Upload } from "lucide-react"

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
import { portfolioItems, type PortfolioItem } from "@/lib/demo-data"

export default function CraftsmanPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>(portfolioItems)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const newItem: PortfolioItem = {
      id: `p-${Date.now()}`,
      craftsmanId: "cp1",
      title,
      description,
      image:
        "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&q=80",
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    }
    setItems((prev) => [newItem, ...prev])
    setTitle("")
    setDescription("")
    setTags("")
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">実績・ポートフォリオ</h1>
        <p className="mt-2 text-muted-foreground">
          これまでの制作実績を登録して依頼者のアピールにつなげましょう。
        </p>
      </div>

      <Card className="mb-8 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">新規実績を追加</CardTitle>
          <CardDescription>
            タイトルと説明を入力して登録してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">タイトル</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：ハイエース 内壁ウッドパネル貼り"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">タグ（カンマ区切り）</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例：ウッド, キャンピング, ハイエース"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">画像</Label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="image"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  画像をアップロード
                </label>
                <Input id="image" type="file" accept="image/*" className="hidden" />
              </div>
            </div>

            <Button type="submit" className="gap-1">
              <Plus className="h-4 w-4" />
              追加する
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden rounded-2xl">
            <img
              src={item.image}
              alt={item.title}
              className="aspect-video w-full object-cover"
            />
            <CardHeader className="pt-4">
              <CardTitle className="font-serif text-base">{item.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {item.description}
              </CardDescription>
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
    </div>
  )
}
