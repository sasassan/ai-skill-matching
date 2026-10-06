"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { notifications as initialNotifications, type Notification, requests, craftsmanProfiles } from "@/lib/demo-data"
import { reverseMatch, type ReverseMatchRecommendation } from "@/lib/ai"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(initialNotifications)
  const [recommendations, setRecommendations] = useState<ReverseMatchRecommendation[]>([])
  const [loadingRecs, setLoadingRecs] = useState(true)

  useEffect(() => {
    const profile = craftsmanProfiles[0]
    const openRequests = requests.filter((r) => r.status === "matching")
    reverseMatch(profile, openRequests)
      .then((recs) => {
        setRecommendations(recs)
        setLoadingRecs(false)
      })
      .catch(() => setLoadingRecs(false))
  }, [])

  const unreadCount = items.filter((n) => !n.read).length

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markOneRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-bold">通知一覧</h1>
          {unreadCount > 0 && (
            <Badge variant="default">未読 {unreadCount}件</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="mr-1 h-4 w-4" />
            すべて既読にする
          </Button>
        )}
      </div>

      <div className="mb-8">
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">AI逆マッチング通知</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRecs ? (
              <p className="text-sm text-muted-foreground">AIがあなたに適した新規案件を探しています...</p>
            ) : (
              <>
                {recommendations.map((rec) => (
                  <div key={rec.requestId} className="rounded-xl border bg-background p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <CardTitle className="font-serif text-base">{rec.title}</CardTitle>
                      <Badge variant="default">推薦スコア {rec.score}点</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    <Button size="sm" variant="outline" asChild className="mt-3">
                      <Link href={`/craftsman/jobs/${rec.requestId}`}>詳細を見る</Link>
                    </Button>
                  </div>
                ))}
                {recommendations.length === 0 && (
                  <p className="text-sm text-muted-foreground">現在、新しいAI推薦案件はありません。</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {items.length === 0 && (
          <Card className="rounded-xl">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">通知はありません。</p>
            </CardContent>
          </Card>
        )}
        {items.map((item) => (
          <Card
            key={item.id}
            className={`rounded-xl transition-opacity ${
              item.read ? "opacity-70" : ""
            }`}
          >
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <CardTitle className="font-serif text-base">{item.title}</CardTitle>
                  {!item.read && <Badge variant="default">新着</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </p>
              </div>
              {!item.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markOneRead(item.id)}
                >
                  既読にする
                </Button>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
