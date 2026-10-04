"use client"

import { useEffect, useState } from "react"
import { Send, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  getMessagesForRequest,
  getRequestById,
  getUserById,
  estimates,
  type Message,
} from "@/lib/demo-data"
import { formatDate } from "@/lib/utils"

export default function RequestMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const id = useRequestId(params)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")

  useEffect(() => {
    if (id) {
      setMessages(getMessagesForRequest(id))
    }
  }, [id])

  const request = id ? getRequestById(id) : undefined
  const estimate = id ? estimates.find((e) => e.requestId === id) : undefined

  const sendMessage = () => {
    if (!text.trim() || !id) return
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      requestId: id,
      senderId: "u-requester-1",
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])
    setText("")
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{request?.title ?? "メッセージ"}</p>
        <h1 className="font-serif text-2xl font-bold">チャット</h1>
      </div>

      {estimate && (
        <Card className="mb-6 rounded-2xl border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-base">見積もり</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-primary">
              ¥{estimate.amount.toLocaleString()}
            </p>
            <p className="text-sm">{estimate.description}</p>
            <Badge variant={estimate.status === "pending" ? "secondary" : "default"}>
              {estimate.status === "pending" ? "未回答" : estimate.status}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="space-y-4">
            {messages.map((message) => {
              const sender = getUserById(message.senderId)
              const isMe = message.senderId === "u-requester-1"
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={sender?.avatar} alt={sender?.name} />
                    <AvatarFallback>{sender?.name?.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p>{message.text}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })}
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                まだメッセージがありません。
              </p>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="メッセージを入力..."
              className="rounded-xl"
            />
            <Button
              onClick={sendMessage}
              disabled={!text.trim()}
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              送信
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function useRequestId(params: Promise<{ id: string }>): string | null {
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    params
      .then((p) => setId(p.id))
      .catch(() => {
        if (typeof window !== "undefined") {
          const segments = window.location.pathname.split("/")
          const idx = segments.indexOf("request")
          setId(idx >= 0 ? segments[idx + 1] ?? null : null)
        }
      })
  }, [params])

  return id
}
