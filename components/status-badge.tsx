import { Badge } from "@/components/ui/badge"
import type { RequestStatus } from "@/lib/demo-data"

interface StatusBadgeProps {
  status: RequestStatus
  className?: string
}

const statusMap: Record<
  RequestStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  draft: { label: "下書き", variant: "secondary" },
  structured: { label: "仕様確定", variant: "default" },
  matching: { label: "マッチング中", variant: "default" },
  quoted: { label: "見積り中", variant: "secondary" },
  contracted: { label: "契約済", variant: "default" },
  in_progress: { label: "製作中", variant: "default" },
  delivered: { label: "納品済", variant: "secondary" },
  completed: { label: "完了", variant: "default" },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, variant } = statusMap[status] ?? { label: status, variant: "outline" }
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
