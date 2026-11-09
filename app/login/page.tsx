"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signInWithEmail, signUpWithEmail, createBrowserSupabaseClient, getProfile } from "@/lib/supabase"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("お名前を入力してください。")
        const result = await signUpWithEmail({ email, password, name })
        if (result.needsEmailConfirmation) {
          setMessage("確認メールを送信しました。メール内のリンクから登録を完了してください。")
        } else {
          router.replace(getPostAuthDestination("/mypage"))
          router.refresh()
        }
      } else {
        const result = await signInWithEmail(email, password)
        const profile = result.user ? await getProfile(createBrowserSupabaseClient(), result.user.id) : null
        const destination = profile?.role === "admin" ? "/admin/dashboard" : "/mypage"
        router.replace(getPostAuthDestination(destination))
        router.refresh()
      }
    } catch {
      setError(mode === "signin" ? "ログインできませんでした。メールアドレスとパスワードをご確認ください。" : "登録できませんでした。入力内容をご確認のうえ、もう一度お試しください。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">ログイン / 新規登録</CardTitle>
          <CardDescription>メールアドレスとパスワードでご利用いただけます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2" aria-label="認証方法">
            <Button type="button" aria-pressed={mode === "signin"} variant={mode === "signin" ? "default" : "outline"} onClick={() => { setMode("signin"); setError(null); setMessage(null) }}>ログイン</Button>
            <Button type="button" aria-pressed={mode === "signup"} variant={mode === "signup" ? "default" : "outline"} onClick={() => { setMode("signup"); setError(null); setMessage(null) }}>新規登録</Button>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <>
                <label className="block space-y-1.5 text-sm font-medium">
                  お名前
                  <input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
                </label>
              </>
            ) : null}
            <label className="block space-y-1.5 text-sm font-medium">
              メールアドレス
              <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              パスワード{mode === "signup" ? "（12文字以上）" : ""}
              <input required type="password" minLength={mode === "signup" ? 12 : undefined} maxLength={128} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
            </label>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            {message ? <p role="status" className="text-sm text-green-700">{message}</p> : null}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "処理中…" : mode === "signin" ? "ログイン" : "アカウントを作成"}
            </Button>
          </form>
          <Button variant="ghost" size="sm" asChild className="w-full">
            <Link href="/"><ArrowLeft className="mr-1 h-4 w-4" />トップに戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function getPostAuthDestination(fallback: string) {
  const requested = new URLSearchParams(window.location.search).get("next")
  if (!requested) return fallback
  const target = new URL(requested, window.location.origin)
  if (target.origin !== window.location.origin) return fallback
  return `${target.pathname}${target.search}${target.hash}`
}
