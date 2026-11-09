import { RoleBadge } from "@/components/role-badge"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getUsers } from "@/lib/supabase-data"
export default async function AdminUsers() {
  const users = await getUsers(await createServerSupabaseClient())
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">ユーザー管理</h1>
      <div className="mt-8 space-y-3">
        {users.map((user) => (
          <article
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5"
          >
            <div>
              <h2 className="font-bold">{user.name}</h2>
              <p className="text-xs text-muted-foreground">{user.id}</p>
            </div>
            <RoleBadge role={user.role} />
          </article>
        ))}
        {!users.length && <p>ユーザーはまだありません。</p>}
      </div>
    </div>
  )
}
