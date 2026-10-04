"use client"

import { useState } from "react"
import { Sparkles, Upload } from "lucide-react"

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
import { structureRequest } from "@/lib/ai"

export default function NewRequestPage() {
  const [input, setInput] = useState("")
  const [budget, setBudget] = useState("")
  const [deadline, setDeadline] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    await structureRequest(input)
    setLoading(false)
    window.location.href = "/request/r1/spec"
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">新しい依頼を作成</CardTitle>
          <CardDescription>
            作りたいものを自由に入力してください。AIが仕様書に整理します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">作りたいものを入力</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="例：アルファードの3列目シート下に、キャンプ道具と子供用品を分けられる着脱式収納ボックスが欲しい。軽量で工具なしで取り外せる仕様。"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="resize-none rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">参考画像（任意）</Label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="image"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  画像をアップロード
                </label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">予算目安</Label>
                <Input
                  id="budget"
                  placeholder="例：15万円〜25万円"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">希望納期</Label>
                <Input
                  id="deadline"
                  placeholder="例：2026年12月中旬"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              disabled={loading || !input.trim()}
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "AIが仕様を作成中..." : "AIで仕様書を作成"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
