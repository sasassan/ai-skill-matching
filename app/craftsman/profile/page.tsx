"use client"

import { useMemo, useRef, useState } from "react"
import {
  Award,
  Camera,
  Check,
  Clock,
  GripHorizontal,
  MapPin,
  PenLine,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
} from "lucide-react"

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
import { Progress } from "@/components/ui/progress"
import { useSession } from "@/components/session-provider"
import {
  skills,
  craftsmanProfiles,
  getReviewsForUser,
  getAverageCategoryScores,
} from "@/lib/demo-data"
import { ReviewStars } from "@/components/review-stars"
import { cn } from "@/lib/utils"

const EQUIPMENT_CATEGORIES: { icon: React.ReactNode; label: string; items: string[] }[] = [
  {
    icon: <Wrench className="h-3.5 w-3.5" />,
    label: "切削・切断",
    items: ["丸ノコ盤", "CNCルーター", "レーザーカッター", "糸鋸盤"],
  },
  {
    icon: <Wrench className="h-3.5 w-3.5" />,
    label: "成型",
    items: ["3Dプリンター", "真空成型機", "樹脂加工機"],
  },
  {
    icon: <PenLine className="h-3.5 w-3.5" />,
    label: "縫製",
    items: ["工業用ミシン", "革裁断機", "ヒートプレス"],
  },
  {
    icon: <Camera className="h-3.5 w-3.5" />,
    label: "塗装・仕上げ",
    items: ["塗装ブース", "サンダー", "エアブラシ"],
  },
  {
    icon: <Wrench className="h-3.5 w-3.5" />,
    label: "電装",
    items: ["配線工具一式", "はんだごて", "電動ドリル"],
  },
]

interface PortfolioPhoto {
  id: string
  preview: string
  caption: string
  file?: File
}

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
  const [equipment, setEquipment] = useState<string[]>(profile?.equipment ?? [])
  const [specialSkills, setSpecialSkills] = useState<string[]>(profile?.specialSkills ?? [])
  const [specialSkillDraft, setSpecialSkillDraft] = useState("")
  const [specialSkillNote, setSpecialSkillNote] = useState("")
  const [qualifications, setQualifications] = useState<string[]>([])
  const [qualificationDraft, setQualificationDraft] = useState("")
  const [experienceYears, setExperienceYears] = useState("")
  const [avatarPreview] = useState(user.avatar)
  const [portfolio, setPortfolio] = useState<PortfolioPhoto[]>(
    profile
      ? [
          {
            id: "placeholder-1",
            preview: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
            caption: "施工実績サンプル",
          },
        ]
      : []
  )
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const completion = useMemo(() => {
    const fields = [
      name.trim().length > 0,
      bio.trim().length > 0,
      location.trim().length > 0,
      selectedSkills.length > 0,
      equipment.length > 0,
      specialSkills.length > 0,
      qualifications.length > 0,
      experienceYears.trim().length > 0,
      portfolio.length > 0,
    ]
    const filled = fields.filter(Boolean).length
    return { filled, total: fields.length }
  }, [name, bio, location, selectedSkills, equipment, specialSkills, qualifications, experienceYears, portfolio])

  const remaining = completion.total - completion.filled
  const progressText =
    remaining === 0
      ? "プロフィール完成！依頼者にアピールできます"
      : `あと ${remaining} 項目入力で完成`

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const addSpecialSkill = () => {
    const value = specialSkillDraft.trim()
    if (!value) return
    const tags = value
      .split(/[,，、]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !specialSkills.includes(t))
    if (tags.length > 0) {
      setSpecialSkills((prev) => [...prev, ...tags])
    }
    setSpecialSkillDraft("")
  }

  const removeSpecialSkill = (tag: string) => {
    setSpecialSkills((prev) => prev.filter((t) => t !== tag))
  }

  const addQualification = () => {
    const value = qualificationDraft.trim()
    if (!value) return
    if (!qualifications.includes(value)) {
      setQualifications((prev) => [...prev, value])
    }
    setQualificationDraft("")
  }

  const removeQualification = (tag: string) => {
    setQualifications((prev) => prev.filter((t) => t !== tag))
  }

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

  const addPortfolioFiles = (files: FileList | null) => {
    if (!files) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))
    const newPhotos: PortfolioPhoto[] = imageFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      preview: URL.createObjectURL(file),
      caption: "",
      file,
    }))
    setPortfolio((prev) => [...prev, ...newPhotos])
  }

  const updatePortfolioCaption = (id: string, caption: string) => {
    setPortfolio((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)))
  }

  const removePortfolio = (id: string) => {
    setPortfolio((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addPortfolioFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
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

      <Card className="mb-6 rounded-2xl border-primary/20 bg-gradient-to-br from-card to-secondary/30">
        <CardContent className="space-y-3 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-lg font-semibold">プロフィール完成度</p>
              <p className="text-sm text-muted-foreground">{progressText}</p>
            </div>
            <span className="font-serif text-2xl font-bold text-primary">
              {Math.round((completion.filled / completion.total) * 100)}%
            </span>
          </div>
          <Progress value={completion.filled} max={completion.total} />
          <p className="text-xs text-muted-foreground">
            完成度が高いプロフィールは、依頼者からの選考率が2倍高まります。
          </p>
        </CardContent>
      </Card>

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
              <AvatarImage src={avatarPreview} alt={user.name} />
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
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="mr-1 inline h-4 w-4" />
                氏名・工房名
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：田中 工房"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">
                <PenLine className="mr-1 inline h-4 w-4" />
                自己紹介・実績
              </Label>
              <Textarea
                id="bio"
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="得意分野、こだわり、過去の代表作などを具体的に書くと信頼感が伝わります。"
                className="resize-none rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                ヒント：道具へのこだわりや対応可能な車種を入れると選ばれやすくなります。
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="mr-1 inline h-4 w-4" />
                  活動エリア
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="例：東京都世田谷区"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">
                  <Clock className="mr-1 inline h-4 w-4" />
                  経験年数
                </Label>
                <Input
                  id="experience"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="例：15年"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>保有資格・認定</Label>
              <div className="flex flex-wrap items-center gap-2">
                {qualifications.map((q) => (
                  <span
                    key={q}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                  >
                    <Award className="h-3.5 w-3.5 text-primary" />
                    {q}
                    <button
                      type="button"
                      onClick={() => removeQualification(q)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={qualificationDraft}
                    onChange={(e) => setQualificationDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addQualification()
                      }
                    }}
                    placeholder="例：一級技能士"
                    className="h-9 w-48 rounded-full text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    onClick={addQualification}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>対応スキル</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {skills.map((skill) => (
                  <label
                    key={skill.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors hover:bg-muted",
                      selectedSkills.includes(skill.id)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input text-primary accent-primary"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                    />
                    <span className="text-sm font-medium">{skill.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {skill.category}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>
                <Wrench className="mr-1 inline h-4 w-4" />
                設備・機材
              </Label>
              <div className="flex flex-wrap gap-2">
                {equipment.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => toggleEquipment(item)}
                      className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  カテゴリからワンタップで追加
                </p>
                <div className="space-y-3">
                  {EQUIPMENT_CATEGORIES.map((category) => (
                    <div key={category.label}>
                      <p className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        {category.icon}
                        {category.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.items.map((item) => {
                          const active = equipment.includes(item)
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleEquipment(item)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:bg-muted"
                              )}
                            >
                              {active && <Check className="h-3 w-3" />}
                              {item}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="specialSkills">こんなこともできます</Label>
              <Textarea
                id="specialSkills"
                rows={3}
                value={specialSkillNote}
                onChange={(e) => setSpecialSkillNote(e.target.value)}
                placeholder="依頼者が気づかない付加価値を自由にアピールしてください。"
                className="resize-none rounded-xl"
              />
              <div className="flex flex-wrap items-center gap-2">
                {specialSkills.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-3 py-1 text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeSpecialSkill(tag)}
                      className="ml-1 rounded-full p-0.5 hover:bg-accent/50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={specialSkillDraft}
                    onChange={(e) => setSpecialSkillDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSpecialSkill()
                      }
                    }}
                    placeholder="タグを入力（Enterまたはカンマで追加）"
                    className="h-9 w-56 rounded-full text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    onClick={addSpecialSkill}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>
                <Camera className="mr-1 inline h-4 w-4" />
                ポートフォリオ写真
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  ドラッグ＆ドロップまたはクリックして写真を追加
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG・PNG形式、1枚ずつ複数追加可能です
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addPortfolioFiles(e.target.files)}
                />
              </div>

              {portfolio.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {portfolio.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="group relative overflow-hidden rounded-xl border border-border bg-card"
                    >
                      <div className="relative aspect-[4/3]">
                        <GripHorizontal className="absolute left-2 top-2 z-10 h-4 w-4 text-white/80 drop-shadow" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.preview}
                          alt={`ポートフォリオ ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <Input
                          value={photo.caption}
                          onChange={(e) =>
                            updatePortfolioCaption(photo.id, e.target.value)
                          }
                          placeholder="キャプションを入力"
                          className="h-8 rounded-lg text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePortfolio(photo.id)}
                        className="absolute right-2 top-2 rounded-full bg-destructive/90 p-1 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="gap-2" size="lg">
              <Save className="h-4 w-4" />
              保存する
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
