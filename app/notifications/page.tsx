"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Bell,
  Check,
  Mail,
  Settings,
  Smartphone,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type Notification,
  craftsmanProfiles,
  requests,
} from "@/lib/demo-data"
import { reverseMatch, type ReverseMatchRecommendation } from "@/lib/ai"
import { notificationStyles } from "@/lib/notifications"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDate } from "@/lib/utils"

export default function NotificationsPage() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications()
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

  const unreadItems = useMemo(() => items.filter((n) => !n.read), [items])

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl font-bold md:text-2xl">通知一覧</h1>
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

      <div className="mb-6 md:mb-8">
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-base md:text-lg">AI逆マッチング通知</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRecs ? (
              <p className="text-sm text-muted-foreground">
                AIがあなたに適した新規案件を探しています...
              </p>
            ) : (
              <>
                {recommendations.map((rec) => (
                  <div
                    key={rec.requestId}
                    className="rounded-xl border bg-background p-4"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <CardTitle className="font-serif text-base">{rec.title}</CardTitle>
                      <Badge variant="default">推薦スコア {rec.score}点</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="mt-3"
                    >
                      <Link href={`/craftsman/jobs/${rec.requestId}`}>詳細を見る</Link>
                    </Button>
                  </div>
                ))}
                {recommendations.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    現在、新しいAI推薦案件はありません。
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-xl">
          <TabsTrigger value="all" className="gap-1">
            <Bell className="h-4 w-4" />
            すべて
            <Badge variant="secondary" className="ml-1 text-xs">{items.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1">
            <Mail className="h-4 w-4" />
            未読
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1 text-xs">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <NotificationList
            items={items}
            emptyText="通知はありません。"
            onMarkRead={markRead}
          />
        </TabsContent>

        <TabsContent value="unread">
          <NotificationList
            items={unreadItems}
            emptyText="未読の通知はありません。"
            onMarkRead={markRead}
          />
        </TabsContent>

        <TabsContent value="settings">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationList({
  items,
  emptyText,
  onMarkRead,
}: {
  items: Notification[]
  emptyText: string
  onMarkRead: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">{emptyText}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const style = notificationStyles[item.type] ?? notificationStyles.system
        const Icon = style.icon
        return (
          <Card
            key={item.id}
            className={`rounded-xl transition-opacity ${
              item.read ? "opacity-70" : ""
            }`}
          >
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="flex flex-1 items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${style.bg} ${style.color} ${style.border}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <CardTitle className="font-serif text-base">{item.title}</CardTitle>
                    {!item.read && (
                      <Badge variant="default" className="text-xs">新着</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
              {!item.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkRead(item.id)}
                >
                  既読にする
                </Button>
              )}
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}

function NotificationSettings() {
  const [emailSettings, setEmailSettings] = useState({
    request: true,
    estimate: true,
    message: true,
    review: true,
  })

  const toggle = (key: keyof typeof emailSettings) => {
    setEmailSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif text-base">メール通知設定</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <EmailSettingRow
            label="新規案件・マッチング"
            description="依頼投稿やAIマッチング候補が見つかったとき"
            checked={emailSettings.request}
            onCheckedChange={() => toggle("request")}
          />
          <EmailSettingRow
            label="見積回答"
            description="技能者から見積もりが届いたとき"
            checked={emailSettings.estimate}
            onCheckedChange={() => toggle("estimate")}
          />
          <EmailSettingRow
            label="メッセージ"
            description="新着チャットメッセージがあるとき"
            checked={emailSettings.message}
            onCheckedChange={() => toggle("message")}
          />
          <EmailSettingRow
            label="評価・完了"
            description="取引完了やレビューが届いたとき"
            checked={emailSettings.review}
            onCheckedChange={() => toggle("review")}
          />
          <p className="text-xs text-muted-foreground">
            ※実際のメール送信はバックエンド連携時に有効化されます。現在はUIのstubです。
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif text-base">プッシュ通知</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ブラウザのプッシュ通知を許可すると、重要な通知をリアルタイムで受け取れます。
          </p>
          <PushPermissionDialog />
        </CardContent>
      </Card>
    </div>
  )
}

function EmailSettingRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = `email-${label}`
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function PushPermissionDialog() {
  const [open, setOpen] = useState(false)
  const [permission, setPermission] =
    useState<NotificationPermission | "unsupported">("default")

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported")
      return
    }
    const result = await window.Notification.requestPermission()
    setPermission(result as NotificationPermission)
  }

  const statusText: Record<typeof permission, string> = {
    default: "まだ許可されていません",
    granted: "通知が許可されました",
    denied: "通知が拒否されています",
    unsupported: "このブラウザはプッシュ通知に対応していません",
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1">
            <Smartphone className="h-4 w-4" />
            プッシュ通知を設定
          </Button>
        }
      />
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">プッシュ通知の許可</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            SkillMatchからの通知を受け取るために、ブラウザの通知許可を求めます。
            実際のプッシュ配信はサービス連携後に有効化されます（stub）。
          </p>
          <div className="rounded-xl bg-muted p-3 text-sm">
            現在の状態:
            <span className="ml-1 font-medium">{statusText[permission]}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1 gap-1"
              onClick={requestPermission}
              disabled={permission === "granted"}
            >
              <Smartphone className="h-4 w-4" />
              通知を許可する
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
