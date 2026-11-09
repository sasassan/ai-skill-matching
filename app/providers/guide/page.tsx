import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getCategories } from "@/lib/supabase-data"

export default async function ProviderGuide() {
  const categories = await createServerSupabaseClient()
    .then(getCategories)
    .catch(() => [])
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <p className="text-xs font-bold tracking-widest text-primary">
        FOR PROVIDERS
      </p>
      <h1 className="mt-3 text-4xl font-bold">あなたの得意を、誰かの力に。</h1>
      <p className="mt-6 leading-8 text-muted-foreground">
        プロフィールを登録し、スキルを出品しましょう。予約や制作の相談を受け付けられます。
      </p>
      <div className="my-10 grid gap-4 md:grid-cols-3">
        {[
          "1. プロフィールを登録",
          "2. スキルを出品",
          "3. 相談・予約を受ける",
        ].map((step) => (
          <div
            key={step}
            className="rounded-xl border bg-card p-6 font-semibold"
          >
            {step}
          </div>
        ))}
      </div>
      <h2 className="text-2xl font-bold">カテゴリと提供条件</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        資格や届出などは事業内容・地域によって異なります。最新の法令・自治体情報をご確認ください。
      </p>
      <div className="mt-6 space-y-4">
        {categories
          .filter((category) => category.isPublic)
          .map((category) => (
            <article
              className="rounded-xl border bg-card p-5"
              key={category.id}
            >
              <h3 className="font-semibold">
                {category.name}
                {category.requiresVerification && "（資格確認が必要）"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {category.verificationNotes ||
                  category.description ||
                  "提供条件は各自でご確認ください。"}
              </p>
            </article>
          ))}
        {!categories.some((category) => category.isPublic) && (
          <p>公開中のカテゴリはまだありません。</p>
        )}
      </div>
      <Link
        href="/mypage"
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-white"
      >
        プロフィールを登録する
      </Link>
    </div>
  )
}
