"use client"

import { useState } from "react"
import { Bell, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { notifications as initialNotifications, type Notification } from "@/lib/demo-data"
import { formatDate } from "@/lib/utils"

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(initialNotifications)

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
