"use client"

import { useState } from "react"
import { Save, User } from "lucide-react"

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "@/components/session-provider"
import {
  skills,
  craftsmanProfiles,
  getReviewsForUser,
  getAverageCategoryScores,
} from "@/lib/demo-data"
import { ReviewStars } from "@/components/review-stars"

export default function CraftsmanProfilePage() {
  const { user } = useSession()
  const profile = craftsmanProfiles.find((p) => p.userId === user.id)
  const reviews = getReviewsForUser(user.id)
  const categoryScores = getAverageCategoryScores(user.id)

  const [name, setName] = useState(user.name)
  const [bio, setBio] = useState(profile?.bio ?? "")
  const [location, setLocation] = useState(profile?.location ?? "")
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    profile?.skills.map((s) => s.id) ?? []
  )
  const [equipment, setEquipment] = useState(profile?.equipment.join("\n") ?? "")
  const [specialSkills, setSpecialSkills] = useState(
    profile?.specialSkills.join("\n") ?? ""
  )

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert("プロフィールを保存しました（デモ）")
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">プロフィール編集</h1>
        <p className="mt-2 text-muted-foreground">
          依頼者に伝わるプロフィールを整えましょう。
        </p>
      </div>

      <Card className="mb-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">評価サマリー</CardTitle>
          <CardDescription>
            {reviews.length > 0
              ? `${reviews.length}件のレビューに基づく平均評価`
              : "まだレビューはありません"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ReviewStars rating={profile?.rating ?? 0} size="lg" />
                <span className="font-serif text-2xl font-bold">
                  {profile?.rating.toFixed(1)}
                </span>
              </div>
              {categoryScores && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">品質</p>
                    <ReviewStars rating={categoryScores.quality} size="sm" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      コミュニケーション
                    </p>
                    <ReviewStars
                      rating={categoryScores.communication}
                      size="sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">納期遵守</p>
                    <ReviewStars rating={categoryScores.deadline} size="sm" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">コスパ</p>
                    <ReviewStars
                      rating={categoryScores.costPerformance}
                      size="sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              完了した取引の依頼者から評価が届くとここに表示されます。
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-serif">{user.name}</CardTitle>
              <CardDescription>
                {profile ? "プロフィールを編集できます" : "新しくプロフィールを作成できます"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="mr-1 inline h-4 w-4" />
                氏名・工房名
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">自己紹介・実績</Label>
              <Textarea
                id="bio"
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="resize-none rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">活動エリア</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label>対応スキル</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {skills.map((skill) => (
                  <label
                    key={skill.id}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input text-primary accent-primary"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                    />
                    <span className="text-sm">{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">設備・機材（1行ずつ）</Label>
              <Textarea
                id="equipment"
                rows={4}
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="resize-none rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialSkills">こんなこともできます（1行ずつ）</Label>
              <Textarea
                id="specialSkills"
                rows={4}
                value={specialSkills}
                onChange={(e) => setSpecialSkills(e.target.value)}
                className="resize-none rounded-xl"
              />
            </div>

            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              保存する
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
