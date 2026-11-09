import { Badge } from "@/components/ui/badge"
import type { BookingStatus, OrderStatus, RequestStatus } from "@/lib/models"

const labels: Record<string, string> = {
  draft: "下書き",
  structured: "募集中",
  matching: "応募受付中",
  quoted: "見積もり済み",
  contracted: "契約済み",
  requested: "予約申請中",
  accepted: "承認済み",
  cancelled_by_customer: "利用者がキャンセル",
  cancelled_by_provider: "提供者がキャンセル",
  completed: "完了",
  reviewed: "レビュー済み",
  consulting: "相談中",
  ordered: "発注済み",
  in_progress: "進行中",
  delivered: "納品済み",
  cancelled: "キャンセル",
}
export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus | OrderStatus | RequestStatus
  className?: string
}) {
  return (
    <Badge variant="secondary" className={className}>
      {labels[status] ?? status}
    </Badge>
  )
}
