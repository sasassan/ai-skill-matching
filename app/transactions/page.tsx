import Link from "next/link"
import { FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { transactions } from "@/lib/demo-data"
import { formatDate } from "@/lib/utils"

export default function TransactionsPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">取引管理</h1>
        <p className="mt-2 text-muted-foreground">
          進行中の取引と過去の取引を確認できます。
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif">取引一覧</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件名</TableHead>
                <TableHead>技能者</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{tx.title}</TableCell>
                  <TableCell>{tx.craftsmanName}</TableCell>
                  <TableCell>¥{tx.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(tx.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionButton status={tx.status} requestId={tx.requestId} />
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    取引はありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ActionButton({
  status,
  requestId,
}: {
  status: (typeof transactions)[number]["status"]
  requestId: string
}) {
  if (status === "quoted") {
    return (
      <Button size="sm" asChild>
        <Link href={`/request/${requestId}/messages`}>見積を確認</Link>
      </Button>
    )
  }
  if (status === "contracted" || status === "in_progress") {
    return (
      <Button size="sm" variant="outline">
        進捗を確認
      </Button>
    )
  }
  if (status === "delivered") {
    return <Button size="sm">受取確認</Button>
  }
  return (
    <Button size="sm" variant="ghost" asChild>
      <Link href={`/request/${requestId}/messages`}>詳細</Link>
    </Button>
  )
}
