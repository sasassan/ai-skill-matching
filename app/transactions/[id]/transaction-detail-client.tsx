"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  CreditCard,
  ClipboardCheck,
  Star,
  MessageCircle,
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
  getEstimateById,
  getUserById,
  getCraftsmanById,
  getEscrowForTransaction,
  transactions,
} from "@/lib/demo-data"
import { formatCurrency, formatDate } from "@/lib/utils"

export function TransactionDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const transaction = getTransactionById(id)
  if (!transaction) return null

  const estimate = getEstimateById(transaction.estimateId)
  const craftsmanProfile = getCraftsmanById(transaction.craftsmanId)
  const craftsmanUser = craftsmanProfile
    ? getUserById(craftsmanProfile.userId)
    : undefined
  const escrow = getEscrowForTransaction(id)

  const addTimelineEvent = (status: typeof transaction.status, note: string) => {
    const tx = transactions.find((t) => t.id === id)
    if (!tx) return
    tx.status = status
    tx.timeline.push({
      id: `te-${Date.now()}`,
      status,
      actorId: "u-requester-1",
      note,
      createdAt: new Date().toISOString(),
    })
    tx.updatedAt = new Date().toISOString()
  }

  const handleInspect = () => {
    addTimelineEvent("completed", "納品物を検収し、取引を完了しました。")
    toast.success("検収が完了しました。レビューをお願いします。")
    router.refresh()
  }

  const statusLabel: Record<string, string> = {
    draft: "下書き",
    structured: "仕様確定",
    matching: "マッチング中",
    quoted: "見積り中",
    contracted: "契約済",
    in_progress: "製作中",
    delivered: "納品済",
    completed: "完了",
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/transactions">
          <ArrowLeft className="mr-1 h-4 w-4" />
          取引一覧に戻る
        </Link>
      </Button>

      <div className="mb-8">
        <p className="text-sm text-muted-foreground">取引番号: {transaction.id}</p>
        <h1 className="font-serif text-2xl font-bold">{transaction.title}</h1>
      </div>

      <Card className="mb-6 rounded-2xl">
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="font-serif text-base">取引概要</CardTitle>
            <CardDescription>
              技能者: {craftsmanUser?.name} / 更新: {formatDate(transaction.updatedAt)}
            </CardDescription>
          </div>
          <Badge variant="default">{statusLabel[transaction.status]}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">合計金額</span>
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

            {transaction.status === "quoted" && !escrow && (
              <Button size="sm" className="gap-1" asChild>
                <Link href={`/request/${transaction.requestId}/payment?transactionId=${transaction.id}`}>
                  <CreditCard className="h-4 w-4" />
                  支払いへ進む
                </Link>
              </Button>
            )}

            {escrow && (
              <Badge variant="outline" className="gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                エスクロー: {escrow.status === "held" ? "支払い済み（保留中）" : escrow.status}
              </Badge>
            )}

            {transaction.status === "delivered" && (
              <Button size="sm" className="gap-1" onClick={handleInspect}>
                <ClipboardCheck className="h-4 w-4" />
                検収して完了
              </Button>
            )}

            {transaction.status === "completed" && (
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link href={`/request/${transaction.requestId}/review?transactionId=${transaction.id}`}>
                  <Star className="h-4 w-4" />
                  レビューする
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
