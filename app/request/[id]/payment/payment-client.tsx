"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Shield,
  CreditCard,
  Lock,
  CheckCircle,
  Building2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  getRequestById,
  getTransactionById,
  getUserById,
  getCraftsmanById,
  escrowPayments,
  transactions,
} from "@/lib/demo-data"
import { formatCurrency } from "@/lib/utils"
import { stripeConnectEnabled } from "@/lib/stripe"

export function PaymentClient({
  requestId,
  transactionId,
}: {
  requestId: string
  transactionId: string
}) {
  const request = getRequestById(requestId)
  const transaction = getTransactionById(transactionId)
  const craftsmanProfile = transaction
    ? getCraftsmanById(transaction.craftsmanId)
    : undefined
  const craftsmanUser = craftsmanProfile
    ? getUserById(craftsmanProfile.userId)
    : undefined

  const [step, setStep] = useState<"form" | "confirm" | "done">("form")
  const [loading, setLoading] = useState(false)

  const platformFee = transaction ? Math.round(transaction.amount * 0.05) : 0
  const craftsmanAmount = transaction ? transaction.amount - platformFee : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep("confirm")
  }

  const handlePay = () => {
    if (!transaction) return
    setLoading(true)
    setTimeout(() => {
      escrowPayments.push({
        id: `pay-${Date.now()}`,
        transactionId: transaction.id,
        requesterId: "u-requester-1",
        craftsmanId: transaction.craftsmanId,
        amount: transaction.amount,
        platformFee,
        craftsmanAmount,
        status: "held",
        paidAt: new Date().toISOString(),
      })

      const tx = transactions.find((t) => t.id === transaction.id)
      if (tx) {
        tx.status = "contracted"
        tx.timeline.push({
          id: `te-${Date.now()}`,
          status: "contracted",
          actorId: "u-requester-1",
          note: "エスクロー支払いを完了し、契約を確定しました。",
          createdAt: new Date().toISOString(),
        })
        tx.updatedAt = new Date().toISOString()
      }

      setLoading(false)
      setStep("done")
      toast.success("支払いが完了しました。エスクローで保留されています。")
    }, 1500)
  }

  if (!transaction) return null

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/transactions/${transactionId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          取引詳細に戻る
        </Link>
      </Button>

      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{request?.title}</p>
        <h1 className="font-serif text-2xl font-bold">エスクロー決済</h1>
      </div>

      {step === "form" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="font-serif">安全なエスクロー支払い</CardTitle>
              </div>
              <CardDescription>
                依頼者が支払い → エスクローで保留 → 検収後に技能者へ支払い
              </CardDescription>
            </CardHeader>            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span>案件名</span>
                  <span className="font-medium">{transaction.title}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span>技能者</span>
                  <span className="font-medium">{craftsmanUser?.name}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="cardNumber">カード番号</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="cardNumber"
                      placeholder="0000 0000 0000 0000"
                      className="rounded-xl pl-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="expiry">有効期限</Label>
                    <Input
                      id="expiry"
                      placeholder="MM / YY"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cvc">CVC</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="cvc"
                        placeholder="123"
                        className="rounded-xl pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex justify-between text-sm">
                  <span>支払い金額</span>
                  <span>{formatCurrency(transaction.amount)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                  <span>プラットフォーム手数料（5%）</span>
                  <span>{formatCurrency(platformFee)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>技能者への支払予定額</span>
                  <span className="text-primary">{formatCurrency(craftsmanAmount)}</span>
                </div>
              </div>

              <Button type="submit" className="w-full gap-2">
                <Lock className="h-4 w-4" />
                支払い確認へ進む
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {step === "confirm" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">支払い内容の確認</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted p-4 text-sm">
              <p>案件名: {transaction.title}</p>
              <p className="mt-1">技能者: {craftsmanUser?.name}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>支払い金額</span>
                <span className="font-bold">{formatCurrency(transaction.amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>プラットフォーム手数料</span>
                <span>{formatCurrency(platformFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>技能者支払予定額</span>
                <span className="text-primary">{formatCurrency(craftsmanAmount)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("form")}
                disabled={loading}
              >
                戻る
              </Button>
              <Button className="flex-1 gap-2" onClick={handlePay} disabled={loading}>
                <CreditCard className="h-4 w-4" />
                {loading ? "処理中..." : "支払う"}
              </Button>
            </div>
            {!stripeConnectEnabled && (
              <Badge variant="outline" className="gap-1">
                <Building2 className="h-3.5 w-3.5" />
                Stripe Connect連携はstubです
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold">支払いが完了しました</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              支払いはエスクローで保留されています。検収後に技能者へ支払われます。
            </p>
            <Button className="mt-6" asChild>
              <Link href={`/transactions/${transactionId}`}>取引詳細へ</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
