"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/status-badge"
import {
  getRequestById,
  getMatchesForRequest,
  getCraftsmanById,
  getUserById,
  craftsmanProfiles,
} from "@/lib/demo-data"

export function AdminRequestDetailClient({ id }: { id: string }) {
  const request = getRequestById(id)
  const matches = getMatchesForRequest(id).sort((a, b) => b.score - a.score)
  const [selectedCraftsman, setSelectedCraftsman] = useState<string | null>(null)

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">依頼が見つかりません</h1>
      </div>
    )
  }

  const spec = request.spec

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/admin/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">{request.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={request.status} />
          <span className="text-sm text-muted-foreground">
            ID: {request.id}
          </span>
        </div>
      </div>

      <Card className="mb-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">依頼内容</CardTitle>
          <CardDescription>{request.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {spec && (
            <div className="rounded-xl bg-muted p-4">
              <h3 className="mb-2 font-serif font-medium">AI仕様書</h3>
              <p className="text-sm">{spec.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {spec.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <span>予算: {spec.budget}</span>
                <span>納期: {spec.deadline}</span>
                <span className="sm:col-span-2">備考: {spec.notes}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">マッチング候補</CardTitle>
          <CardDescription>
            AIが推定した候補技能者一覧です。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {matches.map((match) => {
            const craftsman = getCraftsmanById(match.craftsmanId)
            const user = craftsman ? getUserById(craftsman.userId) : undefined
            if (!craftsman || !user) return null

            return (
              <div
                key={match.id}
                className="flex items-center justify-between rounded-xl border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {craftsman.location}
                    </p>
                  </div>
                </div>
                <Badge variant="default">マッチ度 {match.score}%</Badge>
              </div>
            )
          })}
          {matches.length === 0 && (
            <p className="text-muted-foreground">候補がまだありません。</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">手動アサイン</CardTitle>
          <CardDescription>
            技能者を直接選んで依頼をアサインします。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCraftsman ?? ""} onValueChange={setSelectedCraftsman}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="技能者を選択" />
            </SelectTrigger>
            <SelectContent>
              {craftsmanProfiles.map((craftsman) => {
                const user = getUserById(craftsman.userId)
                return (
                  <SelectItem key={craftsman.id} value={craftsman.id}>
                    {user?.name}（{craftsman.location}）
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Button
            disabled={!selectedCraftsman}
            onClick={() => alert(`${selectedCraftsman} にアサインしました（デモ）`)}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            アサインする
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
