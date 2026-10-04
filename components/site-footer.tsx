import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
          <div>
            <Link href="/" className="font-serif text-xl font-bold">SkillMatch</Link>
            <p className="mt-2 text-sm text-muted-foreground">
              「作りたい」と「できる」を、AIでつなぐ。
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-sm text-muted-foreground">
            <Link href="/request/new" className="hover:text-foreground">依頼する</Link>
            <Link href="/craftsman/dashboard" className="hover:text-foreground">技能者向け</Link>
            <Link href="/mypage" className="hover:text-foreground">マイページ</Link>
            <Link href="/admin/dashboard" className="hover:text-foreground">管理者</Link>
          </div>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          © 2026 SkillMatch. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
