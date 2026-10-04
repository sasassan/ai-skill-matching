import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="font-serif text-6xl font-bold text-primary">404</h1>
      <h2 className="mt-4 font-serif text-2xl font-bold">ページが見つかりません</h2>
      <p className="mt-3 max-w-md text-muted-foreground">
        お探しのページは削除されたか、URLが間違っている可能性があります。
      </p>
      <Button asChild className="mt-8">
        <Link href="/">トップページへ戻る</Link>
      </Button>
    </div>
  )
}
