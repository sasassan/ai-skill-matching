"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Send,
  FileText,
  Paperclip,
  ImageIcon,
  File,
  Check,
  CheckCheck,
  FileImage,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  getMessagesForRequest,
  getRequestById,
  getUserById,
  getEstimatesForRequest,
  getTransactionByRequestId,
  type Message,
  type Attachment,
  currentUser,
} from "@/lib/demo-data"
import { formatDate, formatCurrency } from "@/lib/utils"

export function RequestMessagesClient({ id }: { id: string }) {
  const [messages, setMessages] = useState<Message[]>(() => getMessagesForRequest(id))
  const [text, setText] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [lastPolled, setLastPolled] = useState<Date>(new Date())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const request = getRequestById(id)
  const requestEstimates = getEstimatesForRequest(id)
  const pendingEstimate = requestEstimates.find((e) => e.status === "pending")
  const acceptedEstimate = requestEstimates.find((e) => e.status === "accepted")
  const transaction = getTransactionByRequestId(id)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId !== currentUser.id && !m.readAt
            ? { ...m, readAt: new Date().toISOString() }
            : m
        )
      )
      setLastPolled(new Date())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      requestId: id,
      senderId: currentUser.id,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      readAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    }
    setMessages((prev) => [...prev, newMessage])
    setText("")
    setAttachments([])
  }

  const handleFileSelect = (type: "image" | "file") => {
    const input = type === "image" ? imageInputRef.current : fileInputRef.current
    input?.click()
  }

  const onFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "file"
  ) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const attachment: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type,
        size: `${Math.round(file.size / 1024)}KB`,
      }
      setAttachments((prev) => [...prev, attachment])
    })
    e.target.value = ""
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{request?.title ?? "メッセージ"}</p>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-bold">チャット</h1>
          <Badge variant="outline" className="text-xs">
            更新: {lastPolled.toLocaleTimeString("ja-JP")}
          </Badge>
        </div>
      </div>

      {acceptedEstimate && (
        <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-base">承認済み見積もり</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(acceptedEstimate.total)}
            </p>
            <p className="text-sm">{acceptedEstimate.description}</p>
            {transaction && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/transactions/${transaction.id}`}>取引を確認</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {pendingEstimate && !acceptedEstimate && (
        <Card className="mb-6 rounded-2xl border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-base">見積もりが届いています</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(pendingEstimate.total)}
            </p>
            <p className="text-sm">{pendingEstimate.description}</p>
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link href={`/request/${id}/estimates`}>見積もりを確認・比較</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {messages.map((message) => {
              const sender = getUserById(message.senderId)
              const isMe = message.senderId === currentUser.id
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={sender?.avatar} alt={sender?.name} />
                    <AvatarFallback>{sender?.name?.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    <p className="mb-1 text-xs text-muted-foreground">{sender?.name}</p>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.text && <p>{message.text}</p>}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                                isMe
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-background text-foreground"
                              }`}
                            >
                              {att.type === "image" ? (
                                <FileImage className="h-4 w-4" />
                              ) : (
                                <File className="h-4 w-4" />
                              )}
                              <span className="truncate">{att.name}</span>
                              {att.size && <span className="opacity-70">({att.size})</span>}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      className={`mt-1 flex items-center gap-1 text-xs ${
                        isMe ? "text-muted-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <span>{formatDate(message.createdAt)}</span>
                      {isMe && (
                        <span className="flex items-center gap-0.5">
                          {message.readAt ? (
                            <>
                              <CheckCheck className="h-3 w-3 text-primary" />
                              既読
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3" />
                              未読
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                まだメッセージがありません。
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <Separator />

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-xl bg-muted px-3 py-1.5 text-xs"
                >
                  {att.type === "image" ? (
                    <ImageIcon className="h-3.5 w-3.5" />
                  ) : (
                    <File className="h-3.5 w-3.5" />
                  )}
                  <span className="max-w-[120px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="rounded-full p-0.5 hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onFileChange(e, "file")}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFileChange(e, "image")}
            />
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                  />
                }
              >
                <Paperclip className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-serif">ファイルを添付</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Supabase Storageへのアップロードはデモのため省略しています。
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => handleFileSelect("image")}
                    >
                      <ImageIcon className="h-4 w-4" />
                      画像
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => handleFileSelect("file")}
                    >
                      <File className="h-4 w-4" />
                      ファイル
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="メッセージを入力..."
              className="rounded-xl"
            />
            <Button
              onClick={handleSend}
              disabled={!text.trim() && attachments.length === 0}
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
