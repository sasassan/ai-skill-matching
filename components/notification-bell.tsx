"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/use-notifications"

export function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/notifications" aria-label="通知">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  )
}
