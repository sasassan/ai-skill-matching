import Link from "next/link"
import { FileText, User, Calendar, CheckCircle, XCircle, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getEstimateById,
  getRequestById,
  getUserById,
  getCraftsmanById,
} from "@/lib/demo-data"
import { formatCurrency, formatDate } from "@/lib/utils"

interface EstimatePreviewProps {
  estimateId: string
  showActions?: boolean
  onApprove?: () => void
  onReject?: () => void
}

export function EstimatePreview({
  estimateId,
  showActions = false,
  onApprove,
  onReject,
}: EstimatePreviewProps) {
  const estimate = getEstimateById(estimateId)
  if (!estimate) return null

  const request = getRequestById(estimate.requestId)
  const craftsmanProfile = getCraftsmanById(estimate.craftsmanId)
  const craftsmanUser = craftsmanProfile
    ? getUserById(craftsmanProfile.userId)
    : undefined

  const statusLabel: Record<string, string> = {
    pending: "未回答",
    accepted: "承認済み",
    rejected: "却下",
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-start justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="font-serif">見積書</CardTitle>
        </div>
        <Badge
          variant={
            estimate.status === "accepted"
              ? "default"
              : estimate.status === "rejected"
                ? "destructive"
                : "secondary"
          }
        >
          {statusLabel[estimate.status] ?? estimate.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">案件名</p>
            <p className="font-medium">{request?.title}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">技能者</p>
            <p className="flex items-center gap-1 font-medium">
              <User className="h-3.5 w-3.5" />
              {craftsmanUser?.name}
            </p>
          </div>          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">見積有効期限</p>
            <p className="flex items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(estimate.validUntil)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">作成日</p>
            <p className="font-medium">{formatDate(estimate.createdAt)}</p>
          </div>
        </div>

        <Separator />

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>項目</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">単価</TableHead>
                <TableHead className="text-right">金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>{item.name}</div>
                    {item.note && (
                      <p className="text-xs text-muted-foreground">{item.note}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">小計</span>
            <span>{formatCurrency(estimate.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">消費税（10%）</span>
            <span>{formatCurrency(estimate.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>合計</span>
            <span className="text-primary">{formatCurrency(estimate.total)}</span>
          </div>
        </div>

        <div className="rounded-xl bg-muted p-4">
          <p className="text-sm font-medium">備考・条件</p>
          <p className="mt-1 text-sm text-muted-foreground">{estimate.description}</p>
          {estimate.notes && (
            <p className="mt-2 text-sm text-muted-foreground">{estimate.notes}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href={`/request/${estimate.requestId}/estimates`}>一覧に戻る</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            PDF風印刷
          </Button>
          {showActions && estimate.status === "pending" && (
            <>
              <Button
                size="sm"
                className="gap-1"
                onClick={onApprove}
              >
                <CheckCircle className="h-4 w-4" />
                承認する
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-destructive text-destructive hover:bg-destructive/10"
                onClick={onReject}
              >
                <XCircle className="h-4 w-4" />
                却下する
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
