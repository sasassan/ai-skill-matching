"use client"

import Link from "next/link"
import { ArrowLeft, User, Wrench, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AuthButton } from "@/components/auth-button"
import { useSession } from "@/components/session-provider"

export default function LoginPage() {
  const { switchRole, role, user } = useSession()

  return (
    <div className="container mx-auto flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">ログイン / 新規登録</CardTitle>
          <CardDescription>
            既存アカウントでログインするか、新しくアカウントを作成してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AuthButton className="w-full" size="lg" />

          <div className="rounded-xl bg-muted p-4">
            <p className="mb-3 text-center text-sm font-medium">
              プレビュー：ログインなしで役割を切り替える
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={role === "requester" ? "default" : "outline"}
                size="sm"
                onClick={() => switchRole("requester")}
                className="flex-col gap-1"
              >
                <User className="h-4 w-4" />
                依頼者
              </Button>
              <Button
                variant={role === "craftsman" ? "default" : "outline"}
                size="sm"
                onClick={() => switchRole("craftsman")}
                className="flex-col gap-1"
              >
                <Wrench className="h-4 w-4" />
                技能者
              </Button>
              <Button
                variant={role === "admin" ? "default" : "outline"}
                size="sm"
                onClick={() => switchRole("admin")}
                className="flex-col gap-1"
              >
                <Shield className="h-4 w-4" />
                管理者
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              現在: {user.name}（
              {role === "requester" && "依頼者"}
              {role === "craftsman" && "技能者"}
              {role === "admin" && "管理者"}
              ）
            </p>
          </div>

          <Button variant="ghost" size="sm" asChild className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-1 h-4 w-4" />
              トップに戻る
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
