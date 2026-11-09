"use server"
import {
  createServerSupabaseClient,
  requireServerProfile,
} from "@/lib/supabase-server"
export async function saveAccountName(name: string) {
  const user = await requireServerProfile()
  const normalized = name.trim()
  if (!normalized || normalized.length > 120)
    throw new Error("表示名を入力してください。")
  const { error } = await (
    await createServerSupabaseClient()
  )
    .from("profiles")
    .update({ name: normalized })
    .eq("id", user.id)
  if (error) throw new Error("プロフィールを保存できませんでした。")
}
export async function adminListingStatus(
  id: string,
  status: "paused" | "archived"
) {
  const user = await requireServerProfile()
  if (user.role !== "admin") throw new Error("管理者権限が必要です。")
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["paused", "archived"].includes(status))
    throw new Error("入力が不正です。")
  const { data, error } = await (
    await createServerSupabaseClient()
  )
    .from("listings")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error || !data) throw new Error("出品を更新できませんでした。")
}
