"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  MessageCircle,
  Clock,
  Truck,
  ClipboardCheck,
  Star,
  CreditCard,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TransactionTimeline } from "@/components/transaction-timeline"
import {
  getTransactionById,
  getUserById,
  getEstimateById,
  getEscrowForTransaction,
  transactions,
} from "@/lib/demo-data"
import { formatCurrency, formatDate } from "@/lib/utils"

export function OrderDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const transaction = getTransactionById(id)
  if (!transaction) return null

  const requester = getUserById(transaction.requesterId)
  const estimate = getEstimateById(transaction.estimateId)
  const escrow = getEscrowForTransaction(id)

  const addTimelineEvent = (status: typeof transaction.status, note: string) => {
    const tx = transactions.find((t) => t.id === id)
    if (!tx) return
    tx.status = status
    tx.timeline.push({
      id: `te-${Date.now()}`,
      status,
      actorId: transaction.craftsmanId,
      note,
      createdAt: new Date().toISOString(),
    })
    tx.updatedAt = new Date().toISOString()
  }

  const handleProgress = () => {
    addTimelineEvent("in_progress", "製作を開始しました。")
    toast.success("ステータスを製作中に更新しました。")
    router.refresh()
  }

  const handleDeliver = () => {
    addTimelineEvent("delivered", "納品しました。依頼者の検収を待っています。")
    toast.success("納品報告を送信しました。")
    router.refresh()
  }

  const statusLabel: Record<string, string> = {
    quoted: "見積り中",
    contracted: "契約済",
    in_progress: "製作中",
    delivered: "納品済",
    completed: "完了",
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/craftsman/orders">
          <ArrowLeft className="mr-1 h-4 w-4" />
          受注一覧に戻る
        </Link>
      </Button>

      <div className="mb-8">
        <p className="text-sm text-muted-foreground">受注番号: {transaction.id}</p>
        <h1 className="font-serif text-2xl font-bold">{transaction.title}</h1>
      </div>

      <Card className="mb-6 rounded-2xl">
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="font-serif text-base">受注概要</CardTitle>
            <CardDescription>
              依頼者: {requester?.name} / 更新: {formatDate(transaction.updatedAt)}
            </CardDescription>
          </div>
          <Badge variant="default">{statusLabel[transaction.status]}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">受注金額</span>
            <span className="font-serif text-3xl font-bold text-primary">
              {formatCurrency(transaction.amount)}
            </span>
          </div>

          {estimate && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium">承認済み見積もり</p>
                <p className="text-sm text-muted-foreground">{estimate.description}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link href={`/request/${transaction.requestId}/messages`}>
                <MessageCircle className="h-4 w-4" />
                メッセージ
              </Link>
            </Button>

            {escrow && (
              <Badge variant="outline" className="gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                エスクロー: {escrow.status === "held" ? "支払い済み（保留中）" : escrow.status}
              </Badge>
            )}

            {transaction.status === "contracted" && (
              <Button size="sm" className="gap-1" onClick={handleProgress}>
                <Clock className="h-4 w-4" />
                製作開始
              </Button>
            )}

            {transaction.status === "in_progress" && (
              <Button size="sm" className="gap-1" onClick={handleDeliver}>
                <Truck className="h-4 w-4" />
                納品報告
              </Button>
            )}

            {transaction.status === "delivered" && (
              <Button size="sm" variant="outline" disabled className="gap-1">
                <ClipboardCheck className="h-4 w-4" />
                検収待ち
              </Button>
            )}

            {transaction.status === "completed" && (
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link href={`/craftsman/profile`}>
                  <Star className="h-4 w-4" />
                  評価を確認
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionTimeline
        timeline={transaction.timeline}
        currentStatus={transaction.status}
      />
    </div>
  )
}
