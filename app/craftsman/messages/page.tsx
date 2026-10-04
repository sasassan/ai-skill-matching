import Link from "next/link"
import { MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { messages, requests, getUserById } from "@/lib/demo-data"
import { formatDate } from "@/lib/utils"

export default function CraftsmanMessagesPage() {
  const requestIds = Array.from(new Set(messages.map((m) => m.requestId)))
  const threads = requestIds
    .map((requestId) => {
      const requestMessages = messages.filter((m) => m.requestId === requestId)
      const latest = requestMessages[requestMessages.length - 1]
      const request = requests.find((r) => r.id === requestId)
      return { requestId, request, latest, count: requestMessages.length }
    })
    .filter((t) => t.request)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">メッセージ</h1>
        <p className="mt-2 text-muted-foreground">
          依頼者とのやり取りを確認できます。
        </p>
      </div>

      <div className="space-y-4">
        {threads.map((thread) => {
          const sender = thread.latest
            ? getUserById(thread.latest.senderId)
            : undefined
          return (
            <Card key={thread.requestId} className="rounded-2xl">
              <CardHeader className="flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={sender?.avatar} alt={sender?.name} />
                    <AvatarFallback>{sender?.name?.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="font-serif text-base">
                      {thread.request?.title}
                    </CardTitle>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {thread.latest?.text ?? "まだメッセージがありません"}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{thread.count}件</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {thread.latest
                    ? formatDate(thread.latest.createdAt)
                    : ""}
                </p>
                <Button size="sm" asChild>
                  <Link href={`/request/${thread.requestId}/messages`}>
                    <MessageSquare className="mr-1 h-4 w-4" />
                    開く
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {threads.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                メッセージのやり取りはありません。
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
