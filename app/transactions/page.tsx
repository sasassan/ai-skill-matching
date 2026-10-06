import Link from "next/link"
import { FileText, CreditCard } from "lucide-react"

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
import {
  transactions,
  getEscrowForTransaction,
  getTransactionCraftsmanName,
} from "@/lib/demo-data"
import { formatDate, formatCurrency } from "@/lib/utils"

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
              {transactions.map((tx) => {
                const escrow = getEscrowForTransaction(tx.id)
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.title}</TableCell>
                    <TableCell>{getTransactionCraftsmanName(tx)}</TableCell>
                    <TableCell>{formatCurrency(tx.amount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusBadge status={tx.status} />
                        {escrow && escrow.status === "held" && (
                          <CreditCard className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tx.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton transactionId={tx.id} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
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
  transactionId,
}: {
  transactionId: string
}) {
  return (
    <Button size="sm" variant="outline" asChild>
      <Link href={`/transactions/${transactionId}`}>詳細</Link>
    </Button>
  )
}
