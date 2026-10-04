import { Badge } from "@/components/ui/badge"
import type { UserRole } from "@/lib/demo-data"

interface RoleBadgeProps {
  role: UserRole
  className?: string
}

const roleMap: Record<UserRole, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  requester: { label: "依頼者", variant: "default" },
  craftsman: { label: "技能者", variant: "secondary" },
  admin: { label: "管理者", variant: "outline" },
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const { label, variant } = roleMap[role] ?? { label: role, variant: "outline" }
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
