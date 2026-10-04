import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { transactions } from "@/lib/demo-data"
import { formatDate } from "@/lib/utils"

const steps: { key: string; label: string }[] = [
  { key: "contracted", label: "受注" },
  { key: "in_progress", label: "製作" },
  { key: "delivered", label: "納品" },
  { key: "completed", label: "完了" },
]

export default function CraftsmanOrdersPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">受注管理</h1>
        <p className="mt-2 text-muted-foreground">
          受注から納品までの進捗を管理できます。
        </p>
      </div>

      <div className="space-y-6">
        {transactions.map((tx) => {
          const activeIndex = steps.findIndex((s) => s.key === tx.status)
          const currentIndex = activeIndex >= 0 ? activeIndex : -1

          return (
            <Card key={tx.id} className="rounded-2xl">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="font-serif text-base">{tx.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    依頼者: {tx.craftsmanName}
                  </p>
                </div>
                <Badge variant="default">¥{tx.amount.toLocaleString()}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  {steps.map((step, idx) => (
                    <div key={step.key} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            idx <= currentIndex
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span className="mt-1 text-xs">{step.label}</span>
                      </div>
                      {idx < steps.length - 1 && (
                        <div
                          className={`mx-2 h-0.5 flex-1 ${
                            idx < currentIndex ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    更新: {formatDate(tx.updatedAt)}
                  </p>
                  <Button size="sm" variant="outline">
                    ステータス更新
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {transactions.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground">
              受注はありません。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
