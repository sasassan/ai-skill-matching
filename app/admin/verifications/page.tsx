import { AdminControl } from "@/components/admin-control"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getProviderVerifications } from "@/lib/supabase-data"

export default async function Verifications() {
  const db = await createServerSupabaseClient()
  const verifications = await getProviderVerifications(db)
  const documents = await Promise.all(
    verifications.map(async (item) => {
      if (!item.documentUrl) return null
      const { data } = await db.storage
        .from("verifications")
        .createSignedUrl(item.documentUrl, 300)
      return data?.signedUrl ?? null
    })
  )
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">資格確認管理</h1>
      <div className="mt-8 space-y-3">
        {verifications.map((item, index) => (
          <article
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5"
          >
            <div>
              <h2 className="font-bold">{item.name}</h2>
              <p className="text-sm">
                申請者: {item.providerUserId} / {item.status}
              </p>
              {documents[index] ? (
                <a
                  className="text-sm text-primary underline"
                  href={documents[index]!}
                  target="_blank"
                  rel="noreferrer"
                >
                  確認書類を開く
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {item.documentUrl
                    ? "書類を読み込めませんでした。"
                    : "書類は未提出です。"}
                </p>
              )}
            </div>
            {item.status === "pending" && (
              <AdminControl kind="verification" id={item.id} />
            )}
          </article>
        ))}
        {!verifications.length && <p>資格申請はまだありません。</p>}
      </div>
    </div>
  )
}
