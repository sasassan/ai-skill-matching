"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { requestPayout, setupStripeAccount } from "@/lib/actions"

export function PayoutDashboard({ enabled, connected, revenue, pending, paid, available }: { enabled: boolean; connected: boolean; revenue: number; pending: number; paid: number; available: number | null }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  async function connect() {
    setBusy(true)
    setMessage("")
    try { window.location.assign(await setupStripeAccount()) }
    catch (error) { setMessage(error instanceof Error ? error.message : "Stripe登録を開始できませんでした。"); setBusy(false) }
  }
  async function payout() {
    setBusy(true)
    setMessage("")
    try { await requestPayout(); setMessage("振込を申請しました。銀行への着金は後日になります。"); router.refresh() }
    catch (error) { setMessage(error instanceof Error ? error.message : "振込を申請できませんでした。") }
    finally { setBusy(false) }
  }
  const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`
  if (!enabled) return <p>決済機能を利用するにはStripe設定が必要です</p>
  return <div className="space-y-5">
    <h2 className="text-xl font-bold">売上・振込</h2>
    <div className="grid gap-3 sm:grid-cols-3">
      {[['売上合計（手数料差引後）', revenue], ['サービス完了待ち', pending], ['振込済み', paid]].map(([label, value]) => <div key={label} className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{yen(Number(value))}</p></div>)}
    </div>
    <p>振込可能残高：{available === null ? "確認できません" : yen(available)}</p>
    <p className="text-sm text-muted-foreground">{connected ? "Stripe口座は登録済みです。" : "振込を受け取るにはStripeで口座登録を完了してください。"}</p>
    {connected && <p className="text-sm text-muted-foreground">Stripeの手動振込には保有期限があります。振込可能になった残高は90日以内に申請してください。</p>}
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} onClick={() => void connect()} className="rounded-lg border px-4 py-2">{connected ? "Stripe登録情報を更新" : "Stripe口座を登録"}</button>
      <button disabled={busy || !connected || !available} onClick={() => void payout()} className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50">{busy ? "処理中…" : "振込を申請"}</button>
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>
}
