"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Box,
  Briefcase,
  Check,
  FileText,
  Lightbulb,
  List,
  Package,
  PenTool,
  Sparkles,
  Upload,
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
import { Badge } from "@/components/ui/badge"
import { structureRequest } from "@/lib/ai"
import { cn } from "@/lib/utils"

interface RequestTemplate {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  category: string
  skills: string[]
}

const TEMPLATES: RequestTemplate[] = [
  {
    id: "car-rack",
    icon: <Package className="h-6 w-6" />,
    title: "車載ラック製作",
    description:
      "車内に釣り竿・工具・キャンプ道具を収納できるラックを製作したい。車種：□□。希望：軽量で工具不要で取り外し可能。",
    category: "車両内装カスタム（収納）",
    skills: ["木工", "CAD設計"],
  },
  {
    id: "bike-parts",
    icon: <Bike className="h-6 w-6" />,
    title: "バイクパーツ加工",
    description:
      "バイク用のカスタムパーツ（例：サイドカバー・ステー）を製作したい。素材や取り付け方法の相談も希望。",
    category: "金属加工・カスタムパーツ",
    skills: ["金属加工", "溶接", "樹脂成型"],
  },
  {
    id: "interior",
    icon: <Briefcase className="h-6 w-6" />,
    title: "内装張り替え",
    description:
      "シートやドア内張りの張り替えを検討中。素材は本革または合皮で、色の相談もしたい。車種：□□。",
    category: "車両内装カスタム（張替）",
    skills: ["内装張り替え", "縫製", "レザー"],
  },
  {
    id: "storage-box",
    icon: <Box className="h-6 w-6" />,
    title: "着脱式収納ボックス",
    description:
      "車内のデッドスペースに合わせた、着脱式の収納ボックスが欲しい。軽量・防水・工具不要で取り外せる仕様。",
    category: "車両内装カスタム（収納）",
    skills: ["木工", "樹脂成型", "CAD設計"],
  },
  {
    id: "electrical",
    icon: <Lightbulb className="h-6 w-6" />,
    title: "電装・LED増設",
    description:
      "フットランプ・リアスピーカー・USBポートなどの電装増設を依頼したい。配線処理をきれいに仕上げてほしい。",
    category: "車両電装カスタム",
    skills: ["電装配線", "LED加工"],
  },
  {
    id: "free",
    icon: <PenTool className="h-6 w-6" />,
    title: "自由に入力",
    description: "テンプレートに当てはまらないオリジナルの依頼を入力します。",
    category: "その他",
    skills: [],
  },
]

const STEPS = ["テンプレート選択", "依頼内容", "条件の入力", "確認・作成"]

export default function NewRequestPage() {
  const [step, setStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [requirements, setRequirements] = useState("")
  const [materials, setMaterials] = useState("")
  const [budget, setBudget] = useState("")
  const [deadline, setDeadline] = useState("")
  const [loading, setLoading] = useState(false)

  const selectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      setTitle(template.title)
      setCategory(template.category)
      setDescription(template.description)
      setRequirements("")
      setMaterials("")
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return selectedTemplate !== null
      case 1:
        return title.trim() && description.trim()
      case 2:
        return budget.trim() && deadline.trim()
      default:
        return true
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    setLoading(true)
    await structureRequest(description)
    setLoading(false)
    window.location.href = "/request/r1/spec"
  }

  const fullDescription = buildFullDescription(
    description,
    requirements,
    materials
  )

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">新しい依頼を作成</CardTitle>
          <CardDescription>
            ステップに沿って入力すると、AIが正確な仕様書に整理します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <nav aria-label="依頼作成ステップ" className="mb-8">
            <ol className="flex items-center justify-between gap-2">
              {STEPS.map((label, index) => {
                const status =
                  index < step ? "done" : index === step ? "current" : "upcoming"
                return (
                  <li key={label} className="flex flex-1 flex-col items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                        status === "done" && "bg-primary text-primary-foreground",
                        status === "current" && "border-2 border-primary bg-background text-primary",
                        status === "upcoming" && "border-2 border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {status === "done" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        "hidden text-center text-xs sm:block",
                        status === "current"
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </li>
                )
              })}
            </ol>
          </nav>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium">依頼のテンプレートを選んでください</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => selectTemplate(template.id)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all",
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:bg-muted"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="rounded-xl bg-secondary p-2 text-primary">
                          {template.icon}
                        </span>
                        {selectedTemplate === template.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <span className="font-serif font-semibold">{template.title}</span>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    <FileText className="mr-1 inline h-4 w-4" />
                    案件タイトル
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例：アルファード 着脱式収納ボックス製作"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">
                    <List className="mr-1 inline h-4 w-4" />
                    カテゴリ
                  </Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="例：車両内装カスタム（収納）"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">作りたいものの詳細</Label>
                  <Textarea
                    id="description"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="作りたいものの形状・用途・入れたいものなどを具体的に入力してください。"
                    className="resize-none rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    ヒント：車種・サイズ・使う場面を書くと、技能者がより正確に見積もれます。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requirements">必須条件・こだわり</Label>
                  <Textarea
                    id="requirements"
                    rows={3}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="例：工具なしで取り外せること、防水加工、軽量であることなど"
                    className="resize-none rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materials">希望素材・部材（任意）</Label>
                  <Input
                    id="materials"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="例：合板、ABS樹脂、本革"
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budget">
                      <Briefcase className="mr-1 inline h-4 w-4" />
                      予算目安
                    </Label>
                    <Input
                      id="budget"
                      placeholder="例：15万円〜25万円"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      目安でもOK。後から見積もりで調整できます。
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      ヒント：急ぎの場合は「11月中に完成希望」と書くと対応しやすいです。
                    </p>
                  </div>
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
                  <p className="text-xs text-muted-foreground">
                    雑なラフ画や似たような写真でも、イメージ共有に役立ちます。
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <h3 className="mb-3 font-serif font-semibold">依頼内容の確認</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-border pb-2">
                      <dt className="text-muted-foreground">テンプレート</dt>
                      <dd className="font-medium">
                        {TEMPLATES.find((t) => t.id === selectedTemplate)?.title ?? "自由入力"}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <dt className="text-muted-foreground">タイトル</dt>
                      <dd className="font-medium">{title || "（未入力）"}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <dt className="text-muted-foreground">カテゴリ</dt>
                      <dd className="font-medium">{category || "（未入力）"}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <dt className="text-muted-foreground">予算目安</dt>
                      <dd className="font-medium">{budget || "（未入力）"}</dd>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <dt className="text-muted-foreground">希望納期</dt>
                      <dd className="font-medium">{deadline || "（未入力）"}</dd>
                    </div>
                    <div className="pt-2">
                      <dt className="mb-1 text-muted-foreground">詳細</dt>
                      <dd className="whitespace-pre-wrap text-foreground">{fullDescription}</dd>
                    </div>
                  </dl>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  size="lg"
                  disabled={loading || !description.trim()}
                >
                  <Sparkles className="h-4 w-4" />
                  {loading ? "AIが仕様を作成中..." : "AIで仕様書を作成"}
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                戻る
              </Button>
              {step < STEPS.length - 1 && (
                <Button
                  type="button"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  disabled={!canProceed()}
                  className="gap-1"
                >
                  次へ
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function buildFullDescription(
  description: string,
  requirements: string,
  materials: string
) {
  const parts = [description]
  if (requirements.trim()) {
    parts.push(`\n\n【必須条件】\n${requirements}`)
  }
  if (materials.trim()) {
    parts.push(`\n\n【希望素材】\n${materials}`)
  }
  return parts.join("")
}
