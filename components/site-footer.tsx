import Link from "next/link"
import { appName } from "@/lib/app-config"

export function SiteFooter() {
  return (
    <footer className="border-t bg-card py-10">
      <div className="container mx-auto flex flex-wrap justify-between gap-8 px-4">
        <div>
          <Link href="/" className="font-serif text-xl font-bold">
            {appName}
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            あなたの「できる」が、誰かの「うれしい」に。
          </p>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <Link href="/guide">使い方</Link>
          <Link href="/providers/guide">提供者ガイド</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシー</Link>
        </nav>
      </div>
    </footer>
  )
}
