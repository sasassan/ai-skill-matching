"use client"

import { useCallback, useEffect, useState } from "react"
import { notifications as initialNotifications, type Notification } from "@/lib/demo-data"

const STORAGE_KEY = "skillmatch-notifications"

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return initialNotifications
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return initialNotifications
  try {
    const parsed = JSON.parse(raw) as Notification[]
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore corrupted storage
  }
  return initialNotifications
}

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>(initialNotifications)

  useEffect(() => {
    setItems(loadNotifications())
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  }, [items])

  const unreadCount = items.filter((n) => !n.read).length

  const markRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  return {
    items,
    unreadCount,
    markRead,
    markAllRead,
  }
}
