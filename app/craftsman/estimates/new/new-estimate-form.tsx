"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Send } from "lucide-react"
import { toast } from "sonner"

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
import { estimates, getRequestById, getCraftsmanByUserId } from "@/lib/demo-data"
import { formatCurrency } from "@/lib/utils"
import { useSession } from "@/components/session-provider"

interface EstimateItemInput {
  name: string
  quantity: number
  unitPrice: number
  note: string
}

export function NewEstimateForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useSession()
  const requestId = searchParams.get("requestId") ?? ""
  const request = getRequestById(requestId)
  const craftsman = getCraftsmanByUserId(user.id)

  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [items, setItems] = useState<EstimateItemInput[]>([
    { name: "", quantity: 1, unitPrice: 0, note: "" },
  ])

  const updateItem = (idx: number, field: keyof EstimateItemInput, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, { name: "", quantity: 1, unitPrice: 0, note: "" }])
  }

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!request || !craftsman) return

    const newEstimate = {
      id: `e-${Date.now()}`,
      requestId: request.id,
      craftsmanId: craftsman.id,
      items: items.map((item, i) => ({
        id: `ei-${Date.now()}-${i}`,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
        note: item.note || undefined,
      })),
      subtotal,
      tax,
      total,
      description,
      notes,
      validUntil: validUntil
        ? new Date(validUntil).toISOString()
        : new Date(Date.now() + 14 * 86400000).toISOString(),
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    }
    estimates.push(newEstimate)
    toast.success("見積もりを作成しました。")
    router.push(`/craftsman/jobs/${request.id}`)
  }

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">案件が見つかりません</h1>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/craftsman/jobs/${requestId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          案件詳細に戻る
        </Link>
      </Button>

      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{request.title}</p>
        <h1 className="font-serif text-2xl font-bold">見積書を作成</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">見積項目</CardTitle>
            <CardDescription>
              項目、数量、単価を入力してください。合計は自動計算されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_80px_120px_auto]"
              >
                <div className="space-y-1">
                  <Label className="text-xs">項目名</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                    placeholder="例：耐水ウッドパネル"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">数量</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(idx, "quantity", Number(e.target.value))
                    }
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">単価（円）</Label>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(idx, "unitPrice", Number(e.target.value))
                    }
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="col-span-full space-y-1">
                  <Label className="text-xs">備考</Label>
                  <Input
                    value={item.note}
                    onChange={(e) => updateItem(idx, "note", e.target.value)}
                    placeholder="内壁・床面分など"
                    className="rounded-xl"
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              項目を追加
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">見積概要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="description">説明・対応方針</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="対応方針や納期・保証について記入してください"
                rows={4}
                className="resize-none rounded-xl"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">備考・条件</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="保証期間や追加オプションなど"
                rows={3}
                className="resize-none rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="validUntil">見積有効期限</Label>
              <Input
                id="validUntil"
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="rounded-xl bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span>小計</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>消費税（10%）</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="mt-2 flex justify-between text-lg font-bold">
                <span>合計</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full gap-2">
          <Send className="h-4 w-4" />
          見積もりを送信
        </Button>
      </form>
    </div>
  )
}
