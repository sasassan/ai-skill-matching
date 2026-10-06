"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Star, Camera, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { reviews, getRequestById } from "@/lib/demo-data"

const categories: { key: "quality" | "communication" | "deadline" | "costPerformance"; label: string }[] = [
  { key: "quality", label: "品質" },
  { key: "communication", label: "コミュニケーション" },
  { key: "deadline", label: "納期遵守" },
  { key: "costPerformance", label: "コスパ" },
]

export function ReviewFormClient({
  requestId,
  transactionId,
}: {
  requestId: string
  transactionId?: string
}) {
  const router = useRouter()
  const request = getRequestById(requestId)

  const [overall, setOverall] = useState(5)
  const [scores, setScores] = useState({
    quality: 5,
    communication: 5,
    deadline: 5,
    costPerformance: 5,
  })
  const [comment, setComment] = useState("")
  const [photos, setPhotos] = useState<string[]>([])

  const setScore = (key: keyof typeof scores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      setPhotos((prev) => [...prev, URL.createObjectURL(file)])
    })
    e.target.value = ""
  }

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    reviews.push({
      id: `rev-${Date.now()}`,
      transactionId: transactionId ?? "t-demo",
      reviewerId: "u-requester-1",
      revieweeId: "u-craftsman-1",
      rating: overall,
      categories: scores,
      comment,
      photos: photos.length > 0 ? photos : undefined,
      createdAt: new Date().toISOString(),
    })
    toast.success("レビューを投稿しました。")
    router.push(`/craftsman/cp1`)
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/transactions">
          <ArrowLeft className="mr-1 h-4 w-4" />
          取引一覧に戻る
        </Link>
      </Button>

      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{request?.title}</p>
        <h1 className="font-serif text-2xl font-bold">評価・レビュー</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">総合評価</CardTitle>
            <CardDescription>
              技能者全体の満足度を5段階で評価してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOverall(i + 1)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      i < overall
                        ? "fill-primary text-primary"
                        : "fill-muted text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">評価項目</CardTitle>
            <CardDescription>
              品質・コミュニケーション・納期・コスパを評価してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {categories.map((cat) => (
              <div key={cat.key}>
                <Label className="mb-2 block text-sm">{cat.label}</Label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setScore(cat.key, i + 1)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          i < scores[cat.key]
                            ? "fill-primary text-primary"
                            : "fill-muted text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-medium">{scores[cat.key]}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">レビューコメント</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="具体的な感想や制作物の印象を書いてください"
              rows={5}
              className="resize-none rounded-xl"
              required
            />

            <div className="space-y-2">
              <Label className="text-sm">制作物の写真（任意）</Label>
              <div className="flex flex-wrap gap-3">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative h-24 w-24 overflow-hidden rounded-xl">
                    <img
                      src={photo}
                      alt={`レビュー写真 ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute right-1 top-1 rounded-full bg-background/80 p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground hover:bg-muted"
                >
                  <Camera className="h-6 w-6" />
                  <span className="mt-1 text-xs">追加</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full">
          レビューを投稿
        </Button>
      </form>
    </div>
  )
}
