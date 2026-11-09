"use client"

import Link from "next/link"
import { useSession } from "@/components/session-provider"
import { appName } from "@/lib/app-config"

export function SiteHeader() {
  const { user, logout } = useSession()
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-5">
        <Link href="/" className="font-serif text-xl font-bold">
          {appName}
        </Link>
        <nav
          aria-label="メインナビゲーション"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
        >
          <Link href="/search">探す</Link>
          <Link href="/providers/guide">提供者ガイド</Link>
          <Link href="/guide">使い方</Link>
          <Link href="/mypage">マイページ</Link>
          <Link href="/messages">メッセージ</Link>
          {user?.role === "admin" && <Link href="/admin">管理画面</Link>}
          {user ? (
            <button onClick={() => void logout()}>ログアウト</button>
          ) : (
            <Link className="font-medium text-primary" href="/login">
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
