import Link from "next/link"
import { stripeUnavailableMessage } from "@/lib/stripe"
export default function Guide() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">使い方ガイド</h1>
      <div className="mt-8 space-y-8 leading-8">
        <section>
          <h2 className="text-xl font-bold">1. スキルを探す</h2>
          <p>カテゴリやエリアから、希望に合う出品を探します。</p>
        </section>
        <section>
          <h2 className="text-xl font-bold">2. 予約・相談する</h2>
          <p>
            出品詳細から日時を指定して予約、または制作について相談できます。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold">3. メッセージで確認</h2>
          <p>
            内容を確認し、取引完了後にレビューを投稿できます。勧誘やサービス外での決済はお控えください。
          </p>
        </section>
        <p className="rounded-xl bg-secondary p-5">
          {stripeUnavailableMessage}
        </p>
        <Link
          href="/search"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-white"
        >
          スキルを探す
        </Link>
      </div>
    </div>
  )
}
