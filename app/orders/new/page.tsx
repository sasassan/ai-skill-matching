import { redirect } from "next/navigation"
import { RequestPromptForm } from "@/components/request-prompt-form"
import { getServerProfile } from "@/lib/supabase-server"
export default async function NewOrder() {
  const user = await getServerProfile().catch(() => null)
  if (!user) redirect("/login?next=%2Forders%2Fnew")
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm text-primary">AI CONCIERGE</p>
      <h1 className="mt-3 text-3xl font-bold">やりたいことを相談する</h1>
      <p className="my-6 text-muted-foreground">
        相談内容に合う出品をAIがおすすめします。
      </p>
      <RequestPromptForm />
    </div>
  )
}
