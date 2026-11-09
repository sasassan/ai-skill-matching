import { stripeUnavailableMessage } from "@/lib/stripe"
export default function FAQ() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">よくある質問</h1>
      <div className="mt-8 space-y-6">
        {[
          [
            "利用に登録は必要ですか？",
            "検索は登録なしで利用できます。予約・相談にはログインが必要です。",
          ],
          [
            "提供者にもなれますか？",
            "同じアカウントで提供者プロフィールを登録できます。",
          ],
          ["支払いはできますか？", stripeUnavailableMessage],
          [
            "資格は確認されていますか？",
            "確認済みと表示される場合は、承認された確認記録に基づきます。",
          ],
        ].map(([question, answer]) => (
          <section key={question} className="rounded-xl border bg-card p-6">
            <h2 className="font-bold">{question}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{answer}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
