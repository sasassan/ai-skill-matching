import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

export type UserRole = "user" | "admin"

export interface ProfileRecord {
  id: string
  role: UserRole
  name: string
  avatar_url: string | null
  verified: boolean
  created_at: string
  updated_at: string
}

export type TableName =
  | "profiles"
  | "categories"
  | "category_verification_requirements"
  | "provider_profiles"
  | "provider_skills"
  | "listings"
  | "listing_images"
  | "bookings"
  | "booking_messages"
  | "orders"
  | "order_quotes"
  | "order_messages"
  | "favorites"
  | "reports"
  | "provider_verifications"
  | "skills"
  | "requests"
  | "request_images"
  | "specifications"
  | "matches"
  | "applications"
  | "messages"
  | "estimates"
  | "transactions"
  | "transaction_events"
  | "reviews"
  | "notifications"
  | "identity_verifications"
  | "portfolio_items"
  | "admin_notes"

export interface QueryFilter {
  column: string
  value: string | number | boolean
}

let browserClient: SupabaseClient | undefined

function getSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key || key === "your-anon-key") {
    throw new Error("Supabase is not configured. Set valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY values.")
  }
  let parsedUrl: URL
  try { parsedUrl = new URL(url) } catch { throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.") }
  const validProtocol = parsedUrl.protocol === "https:" || (parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedUrl.hostname))
  if (!validProtocol || parsedUrl.hostname === "your-project.supabase.co") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS, except for local Supabase development.")
  }
  return { url, key }
}

export function createBrowserSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("The browser Supabase client can only be used in the browser.")
  }
  if (!browserClient) {
    const { url, key } = getSupabaseConfiguration()
    browserClient = createBrowserClient(url, key)
  }
  return browserClient
}

export async function signUpWithEmail(input: {
  email: string
  password: string
  name: string
  role?: "requester" | "craftsman" | "user"
}) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim().slice(0, 120)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("有効なメールアドレスを入力してください。")
  if (input.password.length < 12 || input.password.length > 128) {
    throw new Error("パスワードは12〜128文字で入力してください。")
  }
  if (!name) throw new Error("お名前を入力してください。")

  const { data, error } = await createBrowserSupabaseClient().auth.signUp({
    email,
    password: input.password,
    options: { data: { name } },
  })
  if (error) throw new Error(error.message)
  return { user: data.user, needsEmailConfirmation: Boolean(data.user && !data.session) }
}

export async function signInWithEmail(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("有効なメールアドレスを入力してください。")
  }
  if (!password || password.length > 128) throw new Error("メールアドレスまたはパスワードが正しくありません。")
  const { data, error } = await createBrowserSupabaseClient().auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function signOutFromSupabase() {
  const { error } = await createBrowserSupabaseClient().auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getBrowserSession() {
  const { data, error } = await createBrowserSupabaseClient().auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

export async function getProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle()
  if (error) throw new Error("プロフィールを読み込めませんでした。")
  return (data as ProfileRecord | null) ?? null
}

export async function listRecords<T>(
  client: SupabaseClient,
  table: TableName,
  filters: QueryFilter[] = []
): Promise<T[]> {
  let query = client.from(table).select("*")
  for (const filter of filters) query = query.eq(filter.column, filter.value)
  const { data, error } = await query
  if (error) throw new Error("データを読み込めませんでした。")
  return (data ?? []) as T[]
}

export async function getRecord<T>(
  client: SupabaseClient,
  table: TableName,
  id: string
): Promise<T | null> {
  const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle()
  if (error) throw new Error("データを読み込めませんでした。")
  return (data as T | null) ?? null
}

export async function insertRecord<T>(
  client: SupabaseClient,
  table: TableName,
  values: Record<string, unknown>
): Promise<T> {
  const { data, error } = await client.from(table).insert(values).select("*").single()
  if (error) throw new Error("データを保存できませんでした。")
  return data as T
}

export async function updateRecord<T>(
  client: SupabaseClient,
  table: TableName,
  id: string,
  values: Record<string, unknown>
): Promise<T> {
  const { data, error } = await client.from(table).update(values).eq("id", id).select("*").single()
  if (error) throw new Error("データを更新できませんでした。")
  return data as T
}

export async function deleteRecord(client: SupabaseClient, table: TableName, id: string) {
  const { error } = await client.from(table).delete().eq("id", id)
  if (error) throw new Error("データを削除できませんでした。")
}

export async function listRequests<T>(client: SupabaseClient, requesterId?: string) {
  const query = client.from("requests").select("*").order("created_at", { ascending: false })
  const { data, error } = requesterId ? await query.eq("requester_id", requesterId) : await query
  if (error) throw new Error("案件を読み込めませんでした。")
  return (data ?? []) as T[]
}

export async function getRequest<T>(client: SupabaseClient, requestId: string) {
  const { data, error } = await client.from("requests").select("*").eq("id", requestId).maybeSingle()
  if (error) throw new Error("案件を読み込めませんでした。")
  return (data as T | null) ?? null
}

export async function createRequest<T>(client: SupabaseClient, values: Record<string, unknown>) {
  const { data, error } = await client.from("requests").insert(values).select("*").single()
  if (error) throw new Error("案件を作成できませんでした。")
  return data as T
}

export async function updateRequest<T>(
  client: SupabaseClient,
  requestId: string,
  values: Record<string, unknown>
) {
  const { data, error } = await client.from("requests").update(values).eq("id", requestId).select("*").single()
  if (error) throw new Error("案件を更新できませんでした。")
  return data as T
}

export async function listMessages<T>(client: SupabaseClient, requestId: string) {
  return listRecords<T>(client, "messages", [{ column: "request_id", value: requestId }])
}

export async function createMessage<T>(client: SupabaseClient, values: Record<string, unknown>) {
  return insertRecord<T>(client, "messages", values)
}

export async function listReviews<T>(client: SupabaseClient, userId: string) {
  return listRecords<T>(client, "reviews", [{ column: "reviewee_id", value: userId }])
}

export async function createReview<T>(client: SupabaseClient, values: Record<string, unknown>) {
  return insertRecord<T>(client, "reviews", values)
}

export async function listTransactions<T>(client: SupabaseClient, filters: QueryFilter[] = []) {
  return listRecords<T>(client, "transactions", filters)
}

export async function createTransaction<T>(client: SupabaseClient, values: Record<string, unknown>) {
  return insertRecord<T>(client, "transactions", values)
}

export async function updateTransaction<T>(
  client: SupabaseClient,
  transactionId: string,
  values: Record<string, unknown>
) {
  return updateRecord<T>(client, "transactions", transactionId, values)
}
