"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, User, Bell, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useSession } from "@/components/session-provider"
import { cn } from "@/lib/utils"

const requesterLinks = [
  { href: "/craftsmen", label: "技能者を探す" },
  { href: "/request/new", label: "依頼する" },
  { href: "/transactions", label: "取引管理" },
  { href: "/mypage", label: "マイページ" },
]

const craftsmanLinks = [
  { href: "/craftsman/dashboard", label: "ダッシュボード" },
  { href: "/craftsman/jobs", label: "案件一覧" },
  { href: "/craftsman/orders", label: "受注管理" },
  { href: "/craftsman/portfolio", label: "実績" },
]

const adminLinks = [
  { href: "/admin/dashboard", label: "管理ダッシュボード" },
  { href: "/admin/users", label: "ユーザー管理" },
]

export function SiteHeader() {
  const { user, role, switchRole, logout } = useSession()
  const pathname = usePathname()

  const links =
    role === "requester"
      ? requesterLinks
      : role === "craftsman"
        ? craftsmanLinks
        : adminLinks

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-foreground">
              SkillMatch
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
                  pathname === link.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <Link href="/notifications">
              <Bell className="h-5 w-5" />
              <span className="sr-only">通知</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="hidden gap-2 md:flex">
                  <User className="h-4 w-4" />
                  {user.name}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => switchRole("requester")}>
                依頼者としてプレビュー
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchRole("craftsman")}>
                技能者としてプレビュー
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchRole("admin")}>
                管理者としてプレビュー
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">メニュー</span>
                </Button>
              }
            />
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 py-6">
                <p className="px-2 text-sm text-muted-foreground">
                  ログイン中: {user.name}（{roleLabel(role)}）
                </p>
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-2 py-2 text-sm font-medium hover:bg-secondary",
                      pathname === link.href
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="border-border" />
                <Link
                  href="/notifications"
                  className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground hover:bg-secondary"
                >
                  <Bell className="h-4 w-4" /> 通知一覧
                </Link>
                <button
                  onClick={() => switchRole("requester")}
                  className="px-2 py-2 text-left text-sm text-muted-foreground hover:bg-secondary"
                >
                  依頼者ビュー
                </button>
                <button
                  onClick={() => switchRole("craftsman")}
                  className="px-2 py-2 text-left text-sm text-muted-foreground hover:bg-secondary"
                >
                  技能者ビュー
                </button>
                <button
                  onClick={() => switchRole("admin")}
                  className="px-2 py-2 text-left text-sm text-muted-foreground hover:bg-secondary"
                >
                  管理者ビュー
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function roleLabel(role: string) {
  switch (role) {
    case "requester":
      return "依頼者"
    case "craftsman":
      return "技能者"
    case "admin":
      return "管理者"
    default:
      return role
  }
}
