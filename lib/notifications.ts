import type { LucideIcon } from "lucide-react"
import {
  Bell,
  FileText,
  FileCheck,
  MessageCircle,
  Star,
  Sparkles,
} from "lucide-react"
import type { NotificationType } from "@/lib/demo-data"

export interface NotificationStyle {
  icon: LucideIcon
  label: string
  color: string
  bg: string
  border: string
}

export const notificationStyles: Record<NotificationType, NotificationStyle> = {
  request: {
    icon: FileText,
    label: "新規案件",
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
  },
  estimate: {
    icon: FileCheck,
    label: "見積回答",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
  },
  message: {
    icon: MessageCircle,
    label: "メッセージ",
    color: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-200",
  },
  review: {
    icon: Star,
    label: "評価",
    color: "text-yellow-700",
    bg: "bg-yellow-100",
    border: "border-yellow-200",
  },
  ai: {
    icon: Sparkles,
    label: "AI推薦",
    color: "text-purple-700",
    bg: "bg-purple-100",
    border: "border-purple-200",
  },
  system: {
    icon: Bell,
    label: "システム",
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
}
