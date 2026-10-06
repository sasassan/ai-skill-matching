"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"

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

export function JobDetailClient({ id }: { id: string }) {
  const request = getRequestById(id)

  const [estimate, setEstimate] = useState("")
  const [message, setMessage] = useState("")

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`応募しました（デモ）\n見積額: ¥${estimate}\nメッセージ: ${message}`)
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
        <Link href="/craftsman/jobs">
          <ArrowLeft className="mr-1 h-4 w-4" />
          案件一覧に戻る
        </Link>
      </Button>

      <Card className="mb-6 rounded-2xl">
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="font-serif text-xl">{request.title}</CardTitle>
            <CardDescription className="mt-1">{request.description}</CardDescription>
          </div>
          <StatusBadge status={request.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          {request.spec && (
            <div className="rounded-xl bg-muted p-4">
              <h3 className="mb-2 font-serif font-medium">AI仕様書</h3>
              <p className="text-sm">{request.spec.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {request.spec.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                <span>予算: {request.spec.budget}</span>
                <span>納期: {request.spec.deadline}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">応募・見積もり</CardTitle>
          <CardDescription>
            依頼者に提案内容と見積もりを送りましょう。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApply} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="estimate">見積もり金額（円）</Label>
              <Input
                id="estimate"
                type="number"
                placeholder="例：200000"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">提案メッセージ</Label>
              <Textarea
                id="message"
                rows={5}
                placeholder="対応方針や納期・保証について記入してください"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none rounded-xl"
              />
            </div>

            <Button type="submit" className="gap-2">
              <Send className="h-4 w-4" />
              応募する
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
