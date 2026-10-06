import { cn } from "cn"

export { cn }

export function formatDate(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
  }).format(date)
}
