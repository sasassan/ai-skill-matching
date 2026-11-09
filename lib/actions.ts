"use server"

import "server-only"
import type { Attachment, BookingStatus, FulfillmentType, ListingStatus, OrderStatus } from "@/lib/models"
import { deleteListing as removeListing, deleteListingImage, insertBooking, insertListing, insertListingImage, insertOrder, insertTradeMessage, markTradeMessageRead, updateListing, type ListingValues } from "@/lib/supabase-data"
import { createServerSupabaseClient, requireServerProfile } from "@/lib/supabase-server"

function id(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("IDが不正です。")
  return value
}
function required(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error("入力内容が不正です。")
  return value.trim()
}
function optional(value: unknown, max: number): string | null {
  if (value === null || value === undefined || value === "") return null
  return required(value, max)
}
function price(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000) throw new Error("金額は1円以上で入力してください。")
  return value
}
function stringList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error("一覧が不正です。")
  return value.map((item) => required(item, 120))
}
function tradeType(value: unknown): FulfillmentType {
  if (value !== "booking" && value !== "order") throw new Error("取引方式が不正です。")
  return value
}
async function admin() {
  const profile = await requireServerProfile()
  if (profile.role !== "admin") throw new Error("管理者権限が必要です。")
  return profile
}

export async function createListing(input: {
  categoryId: string; fulfillmentType: FulfillmentType; title: string; description: string;
  priceBasis: "fixed" | "hourly" | "consultation"; price: number | null; serviceAreas: string[];
  location?: string | null; coordinates?: { lat: number; lng: number } | null;
  availability?: Record<string, unknown>; status?: ListingStatus
}) {
  const actor = await requireServerProfile()
  const db = await createServerSupabaseClient()
  const { data: provider, error } = await db.from("provider_profiles").select("id").eq("user_id", actor.id).maybeSingle()
  if (error) throw new Error("提供者プロフィールを確認できませんでした。")
  if (!provider) throw new Error("提供者プロフィールを登録してください。")
  if (!["fixed", "hourly", "consultation"].includes(input.priceBasis)) throw new Error("料金方式が不正です。")
  if (input.priceBasis !== "consultation" && input.price == null) throw new Error("料金を入力してください。")
  const categoryId = id(input.categoryId)
  const fulfillmentType = tradeType(input.fulfillmentType)
  const { data: category, error: categoryError } = await db.from("categories").select("is_public,requires_verification,supported_fulfillment_types").eq("id", categoryId).maybeSingle()
  if (categoryError) throw new Error("カテゴリを確認できませんでした。")
  if (!category?.is_public || !category.supported_fulfillment_types.includes(fulfillmentType)) throw new Error("選択したカテゴリまたは取引方式は利用できません。")
  if (category.requires_verification) {
    const { data: verified, error: verificationError } = await db.rpc("provider_verified_categories", { target_user_id: actor.id })
    if (verificationError) throw new Error("資格確認状況を確認できませんでした。")
    if (!verified?.some((item: { category_id: string }) => item.category_id === categoryId)) throw new Error("このカテゴリへの出品には資格確認の承認が必要です。マイページから申請してください。")
  }
  if (input.status && !["draft", "published", "paused", "archived"].includes(input.status)) throw new Error("公開状態が不正です。")
  if (input.coordinates && (!Number.isFinite(input.coordinates.lat) || !Number.isFinite(input.coordinates.lng) || Math.abs(input.coordinates.lat) > 90 || Math.abs(input.coordinates.lng) > 180)) throw new Error("位置情報が不正です。")
  if (input.availability && (typeof input.availability !== "object" || Array.isArray(input.availability) || JSON.stringify(input.availability).length > 10000)) throw new Error("予約可能日時が不正です。")
  const values: ListingValues = {
    provider_id: provider.id, category_id: categoryId, fulfillment_type: fulfillmentType,
    title: required(input.title, 200), description: required(input.description, 5000), price_basis: input.priceBasis,
    price: price(input.price), service_areas: stringList(input.serviceAreas), location: optional(input.location, 200),
    coordinates: input.coordinates ?? null, availability: input.availability ?? {}, status: input.status ?? "draft",
  }
  return insertListing(db, values)
}

export async function createBooking(input: { listingId: string; scheduledStart: string; scheduledEnd: string; placeType: "provider" | "customer" | "online"; placeNote?: string }) {
  const actor = await requireServerProfile()
  const db = await createServerSupabaseClient()
  const listingId = id(input.listingId)
  const start = new Date(input.scheduledStart), end = new Date(input.scheduledEnd)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start.getTime() <= Date.now() || end <= start || !["provider", "customer", "online"].includes(input.placeType)) throw new Error("予約日時または場所が不正です。")
  const { data: listing, error: listingError } = await db.from("listings").select("id,price,provider:provider_profiles(user_id)").eq("id", listingId).eq("status", "published").eq("fulfillment_type", "booking").maybeSingle()
  const provider = Array.isArray(listing?.provider) ? listing.provider[0] : listing?.provider
  if (listingError || !listing || !provider || !provider.user_id) throw new Error("予約可能な出品が見つかりません。")
  return insertBooking(db, { listing_id: listingId, customer_id: actor.id, provider_user_id: provider.user_id, scheduled_start: start.toISOString(), scheduled_end: end.toISOString(), place_type: input.placeType, place_note: optional(input.placeNote, 1000), amount: listing.price })
}

export async function bookingStatus(bookingId: string, status: BookingStatus, reason?: string) {
  await requireServerProfile()
  const db = await createServerSupabaseClient()
  const { error } = await db.rpc("update_booking_status", { target_booking_id: id(bookingId), next_status: required(status, 50), reason: optional(reason, 1000) })
  if (error) throw new Error("予約状態を変更できませんでした。")
}

export async function createOrder(input: { listingId?: string | null; providerProfileId?: string | null; title: string; description: string; specification?: Record<string, unknown> | null }) {
  const actor = await requireServerProfile()
  const db = await createServerSupabaseClient()
  if (input.specification && (typeof input.specification !== "object" || Array.isArray(input.specification) || JSON.stringify(input.specification).length > 20000)) throw new Error("仕様が不正です。")
  return insertOrder(db, { listing_id: input.listingId ? id(input.listingId) : null, provider_profile_id: input.providerProfileId ? id(input.providerProfileId) : null, customer_id: actor.id, title: required(input.title, 200), description: required(input.description, 5000), specification: input.specification ?? null })
}

export async function orderStatus(orderId: string, status: OrderStatus, reason?: string) {
  await requireServerProfile()
  const db = await createServerSupabaseClient()
  const { error } = await db.rpc("update_order_status", { target_order_id: id(orderId), next_status: required(status, 50), reason: optional(reason, 1000) })
  if (error) throw new Error("注文状態を変更できませんでした。")
}

export async function submitOrderQuote(orderId: string, amount: number, description: string) {
  await requireServerProfile()
  const safeAmount = price(amount)
  if (safeAmount === null) throw new Error("金額が不正です。")
  const db = await createServerSupabaseClient()
  const { data, error } = await db.rpc("submit_order_quote", { target_order_id: id(orderId), quote_amount: safeAmount, quote_description: required(description, 5000) })
  if (error) throw new Error("見積もりを提出できませんでした。")
  return data as string
}

export async function sendMessage(type: FulfillmentType, tradeId: string, text: string, attachments: Attachment[] = []) {
  const actor = await requireServerProfile()
  if (!Array.isArray(attachments) || attachments.length > 10) throw new Error("添付ファイルが不正です。")
  const safeAttachments = attachments.map((attachment) => {
    if (!attachment || !["image", "file"].includes(attachment.type)) throw new Error("添付ファイルが不正です。")
    const url = required(attachment.url, 2000)
    if (!url.startsWith("https://")) throw new Error("添付ファイルのURLが不正です。")
    return { id: required(attachment.id, 120), name: required(attachment.name, 200), url, type: attachment.type, size: attachment.size ? required(attachment.size, 50) : undefined }
  })
  return insertTradeMessage(await createServerSupabaseClient(), tradeType(type), id(tradeId), actor.id, required(text, 5000), safeAttachments)
}

export async function toggleFavorite(listingId: string) {
  await requireServerProfile()
  const { data, error } = await (await createServerSupabaseClient()).rpc("toggle_listing_favorite", { target_listing_id: id(listingId) })
  if (error) throw new Error("お気に入りを更新できませんでした。")
  return Boolean(data)
}

export async function createReport(input: { targetType: "listing" | "profile" | "booking" | "order" | "message" | "review"; targetId: string; reason: "illegal" | "fraud" | "harassment" | "adult" | "off_platform_payment" | "other"; details?: string }) {
  const actor = await requireServerProfile()
  if (!["listing", "profile", "booking", "order", "message", "review"].includes(input.targetType) || !["illegal", "fraud", "harassment", "adult", "off_platform_payment", "other"].includes(input.reason)) throw new Error("通報内容が不正です。")
  const { error } = await (await createServerSupabaseClient()).from("reports").insert({ reporter_id: actor.id, target_type: input.targetType, target_id: id(input.targetId), reason: input.reason, details: optional(input.details, 5000) })
  if (error) throw new Error("通報を送信できませんでした。")
}

export async function saveProviderProfile(input: { bio?: string; location?: string; prefecture?: string; serviceAreas?: string[]; qualifications?: string[] }) {
  const actor = await requireServerProfile()
  const db = await createServerSupabaseClient()
  const { data, error } = await db.from("provider_profiles").upsert({ user_id: actor.id, bio: optional(input.bio, 5000), location: optional(input.location, 200), prefecture: optional(input.prefecture, 100), service_areas: stringList(input.serviceAreas ?? []), qualifications: stringList(input.qualifications ?? []) }, { onConflict: "user_id" }).select("id").single()
  if (error) throw new Error("提供者プロフィールを保存できませんでした。")
  return data.id as string
}

export async function submitVerification(input: { categoryId: string; type: "license" | "permit" | "insurance" | "training" | "other"; name: string; documentPath?: string }) {
  const actor = await requireServerProfile()
  if (!["license", "permit", "insurance", "training", "other"].includes(input.type)) throw new Error("確認種別が不正です。")
  const path = optional(input.documentPath, 1000)
  if (path && (!path.startsWith(`${actor.id}/`) || /(^|\/)\.{1,2}(\/|$)/.test(path))) throw new Error("確認書類のパスが不正です。")
  const { data, error } = await (await createServerSupabaseClient()).from("provider_verifications").upsert({ provider_user_id: actor.id, category_id: id(input.categoryId), type: input.type, name: required(input.name, 200), document_url: path, status: "pending", reviewed_by: null, reviewed_at: null, note: null }, { onConflict: "provider_user_id,category_id,name" }).select("id").single()
  if (error) throw new Error("確認申請を送信できませんでした。")
  return data.id as string
}

export async function createTradeReview(type: FulfillmentType, tradeId: string, rating: number, comment: string, categories: Record<string, number> = {}) {
  await requireServerProfile()
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || Object.values(categories).some((value) => !Number.isInteger(value) || value < 1 || value > 5) || Object.keys(categories).length > 10) throw new Error("評価が不正です。")
  const { data, error } = await (await createServerSupabaseClient()).rpc("create_trade_review", { trade_type: tradeType(type), trade_id: id(tradeId), review_rating: rating, review_comment: optional(comment, 5000) ?? "", review_categories: categories })
  if (error) throw new Error("レビューを投稿できませんでした。")
  return data as string
}

export async function adminSetCategoryVisibility(categoryId: string, isPublic: boolean) {
  await admin()
  if (typeof isPublic !== "boolean") throw new Error("公開状態が不正です。")
  const { data, error } = await (await createServerSupabaseClient()).from("categories").update({ is_public: isPublic }).eq("id", id(categoryId)).select("id").maybeSingle()
  if (error || !data) throw new Error("カテゴリを更新できませんでした。")
}

export async function adminReviewVerification(verificationId: string, status: "approved" | "rejected", note?: string) {
  const actor = await admin()
  if (status !== "approved" && status !== "rejected") throw new Error("確認結果が不正です。")
  const { data, error } = await (await createServerSupabaseClient()).from("provider_verifications").update({ status, reviewed_by: actor.id, reviewed_at: new Date().toISOString(), note: optional(note, 1000) }).eq("id", id(verificationId)).eq("status", "pending").select("id").maybeSingle()
  if (error || !data) throw new Error("確認結果を保存できませんでした。")
}

export async function adminUpdateReport(reportId: string, status: "reviewing" | "actioned" | "dismissed") {
  const actor = await admin()
  if (!["reviewing", "actioned", "dismissed"].includes(status)) throw new Error("通報状態が不正です。")
  const { data, error } = await (await createServerSupabaseClient()).from("reports").update({ status, handled_by: actor.id }).eq("id", id(reportId)).select("id").maybeSingle()
  if (error || !data) throw new Error("通報を更新できませんでした。")
}

export async function changeListing(listingId: string, input: { title: string; description: string; priceBasis: "fixed" | "hourly" | "consultation"; price: number | null; serviceAreas: string[]; location?: string | null; status: ListingStatus }) {
  await requireServerProfile()
  if (!["fixed", "hourly", "consultation"].includes(input.priceBasis) || !["draft", "published", "paused", "archived"].includes(input.status)) throw new Error("出品内容が不正です。")
  if (input.priceBasis !== "consultation" && input.price == null) throw new Error("料金を入力してください。")
  return updateListing(await createServerSupabaseClient(), id(listingId), { title: required(input.title, 200), description: required(input.description, 5000), price_basis: input.priceBasis, price: price(input.price), service_areas: stringList(input.serviceAreas), location: optional(input.location, 200), status: input.status })
}

export async function deleteListing(listingId: string) {
  await requireServerProfile()
  await removeListing(await createServerSupabaseClient(), id(listingId))
}

export async function addListingImage(listingId: string, url: string, sortOrder = 0) {
  const actor = await requireServerProfile()
  const parsed = new URL(required(url, 2000))
  const base = new URL(required(process.env.NEXT_PUBLIC_SUPABASE_URL, 2000))
  const storagePath = `${base.pathname.replace(/\/$/, "")}/storage/v1/object/public/listing-images/${actor.id}/`
  if (parsed.origin !== base.origin || !parsed.pathname.startsWith(storagePath) || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100) throw new Error("画像が不正です。")
  return insertListingImage(await createServerSupabaseClient(), id(listingId), parsed.toString(), sortOrder)
}

export async function removeListingImage(imageId: string) {
  await requireServerProfile()
  await deleteListingImage(await createServerSupabaseClient(), id(imageId))
}

export async function readMessage(type: FulfillmentType, messageId: string) {
  await requireServerProfile()
  await markTradeMessageRead(await createServerSupabaseClient(), tradeType(type), id(messageId))
}

export async function assignOrderProvider(orderId: string, providerProfileId: string) {
  await requireServerProfile()
  const { error } = await (await createServerSupabaseClient()).rpc("assign_order_provider", { target_order_id: id(orderId), target_provider_profile_id: id(providerProfileId) })
  if (error) throw new Error("提供者を指定できませんでした。")
}
