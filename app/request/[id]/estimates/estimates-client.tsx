"use client"

import Link from "next/link"
import { FileText, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getRequestById,
  getEstimatesForRequest,
  getCraftsmanById,
  getUserById,
  type Estimate,
} from "@/lib/demo-data"
import { formatCurrency, formatDate } from "@/lib/utils"

export function EstimatesClient({ id }: { id: string }) {
  const request = getRequestById(id)
  const estimates = getEstimatesForRequest(id)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/request/${id}/messages`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          チャットに戻る
        </Link>
      </Button>

      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{request?.title}</p>
        <h1 className="font-serif text-2xl font-bold">見積もり比較</h1>
      </div>

      {estimates.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            見積もりはまだ届いていません。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="font-serif">見積もり一覧</CardTitle>
              </div>
              <CardDescription>
                複数の技能者からの見積もりを比較できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>技能者</TableHead>
                    <TableHead>合計金額</TableHead>
                    <TableHead>有効期限</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimates.map((estimate) => (
                    <EstimateRow key={estimate.id} estimate={estimate} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {estimates.map((estimate) => (
              <EstimateSummaryCard key={estimate.id} estimate={estimate} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EstimateRow({ estimate }: { estimate: Estimate }) {
  const craftsman = getCraftsmanById(estimate.craftsmanId)
  const user = craftsman ? getUserById(craftsman.userId) : undefined
  const statusMap: Record<Estimate["status"], string> = {
    pending: "未回答",
    accepted: "承認済み",
    rejected: "却下",
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{user?.name ?? "不明"}</TableCell>
      <TableCell>{formatCurrency(estimate.total)}</TableCell>
      <TableCell>{formatDate(estimate.validUntil)}</TableCell>
      <TableCell>
        <Badge
          variant={
            estimate.status === "accepted"
              ? "default"
              : estimate.status === "rejected"
                ? "destructive"
                : "secondary"
          }
        >
          {statusMap[estimate.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/request/${estimate.requestId}/estimates/${estimate.id}`}>
            詳細
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

function EstimateSummaryCard({ estimate }: { estimate: Estimate }) {
  const craftsman = getCraftsmanById(estimate.craftsmanId)
  const user = craftsman ? getUserById(craftsman.userId) : undefined

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="font-serif text-base">{user?.name ?? "不明"}</CardTitle>
        <CardDescription>
          {craftsman?.location} / 評価 {craftsman?.rating}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold text-primary">
          {formatCurrency(estimate.total)}
        </div>
        <ul className="space-y-1 text-sm">
          {estimate.items.slice(0, 3).map((item) => (
            <li key={item.id} className="flex justify-between">
              <span className="text-muted-foreground">{item.name}</span>
              <span>{formatCurrency(item.amount)}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full gap-1" asChild>
          <Link href={`/request/${estimate.requestId}/estimates/${estimate.id}`}>
            <FileText className="h-4 w-4" />
            見積書を確認
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
