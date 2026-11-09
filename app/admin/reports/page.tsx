import { AdminControl } from "@/components/admin-control"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getReports } from "@/lib/supabase-data"
export default async function Reports() {
  const reports = await getReports(await createServerSupabaseClient())
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">通報管理</h1>
      <div className="mt-8 space-y-3">
        {reports.map((report) => (
          <article
            key={report.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5"
          >
            <div>
              <h2 className="font-bold">
                {report.targetType} / {report.reason}
              </h2>
              <p className="text-sm">
                対象: {report.targetId} / {report.status}
              </p>
              <p className="text-sm text-muted-foreground">{report.details}</p>
            </div>
            <AdminControl kind="report" id={report.id} />
          </article>
        ))}
        {!reports.length && <p>通報はまだありません。</p>}
      </div>
    </div>
  )
}
