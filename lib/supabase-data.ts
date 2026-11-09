import type { SupabaseClient } from "@supabase/supabase-js"
import type { Attachment, Booking, BookingStatus, Category, CraftsmanProfile, Estimate, EstimateItem, FulfillmentType, Listing, ListingImage, ListingStatus, Match, Message, Notification, NotificationType, Order, OrderStatus, PortfolioItem, ProjectRequest, ProviderVerification, Report, RequestStatus, Review, Skill, TimelineEvent, TradeMessage, Transaction, User } from "@/lib/models"

type Row = Record<string, unknown>

const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
const record = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}
const relation = (value: unknown): Row => Array.isArray(value) ? record(value[0]) : record(value)
const status = (value: unknown): RequestStatus => value === "draft" || value === "structured" || value === "matching" || value === "quoted" || value === "contracted" || value === "in_progress" || value === "delivered" || value === "completed" ? value : "draft"

export function mapProfile(row: Row): User {
  return { id: text(row.id), name: text(row.name, "ユーザー"), email: text(row.email), role: row.role === "admin" ? "admin" : "user", avatar: text(row.avatar_url), verified: Boolean(row.verified) }
}

export function mapCraftsman(row: Row): CraftsmanProfile {
  const profile = relation(row.profile)
  const skills = Array.isArray(row.skills) ? row.skills.map((item: unknown) => record(record(item).skill)).filter((skill) => Boolean(skill.id)) : []
  const coordinates = record(row.coordinates)
  return {
    id: text(row.id), userId: text(row.user_id), name: text(profile.name, "技能者"), avatar: text(profile.avatar_url), bio: text(row.bio), location: text(row.location), prefecture: text(row.prefecture),
    coordinates: { lat: Number(coordinates.lat ?? 0), lng: Number(coordinates.lng ?? 0) }, serviceAreas: strings(row.service_areas),
    skills: skills.map((skill): Skill => ({ id: text(skill.id), name: text(skill.name), category: text(skill.category) })),
    equipment: strings(row.equipment), materials: strings(row.materials), specialSkills: strings(row.special_skills), specialSkillsNote: text(row.special_skills_note), qualifications: strings(row.qualifications), experienceYears: text(row.experience_years),
    rating: Number(row.rating ?? 0), reviewCount: Number(row.review_count ?? 0), completedOrders: Number(row.completed_orders ?? 0),
    hourlyRate: typeof row.hourly_rate === "number" ? row.hourly_rate : undefined,
  }
}

export function mapRequest(row: Row): ProjectRequest {
  const spec = relation(row.spec)
  return {
    id: text(row.id), requesterId: text(row.requester_id), title: text(row.title), description: text(row.description), status: status(row.status),
    image: typeof row.image_url === "string" ? row.image_url : undefined, createdAt: text(row.created_at),
    spec: spec.id ? { id: text(spec.id), requestId: text(spec.request_id), title: text(spec.title, text(row.title)), summary: text(spec.summary), category: text(spec.category), requiredSkills: strings(spec.required_skills), materials: strings(spec.materials), budget: text(spec.budget), deadline: text(spec.deadline), notes: text(spec.notes) } : undefined,
  }
}

export function mapMessage(row: Row): Message {
  return { id: text(row.id), requestId: text(row.request_id), senderId: text(row.sender_id), text: text(row.text), createdAt: text(row.created_at), readAt: typeof row.read_at === "string" ? row.read_at : undefined, attachments: Array.isArray(row.attachments) ? row.attachments as Attachment[] : [] }
}

export function mapEstimate(row: Row): Estimate {
  return { id: text(row.id), requestId: text(row.request_id), craftsmanId: text(row.craftsman_id), items: Array.isArray(row.items) ? row.items as EstimateItem[] : [], subtotal: Number(row.subtotal ?? 0), tax: Number(row.tax ?? 0), total: Number(row.total ?? 0), description: text(row.description), notes: text(row.notes) || undefined, validUntil: text(row.valid_until), status: row.status === "accepted" || row.status === "rejected" ? row.status : "pending", createdAt: text(row.created_at) }
}

export function mapTransaction(row: Row): Transaction {
  const request = relation(row.request)
  const events = Array.isArray(row.events) ? row.events : []
  const craftsman = relation(row.craftsman)
  return { id: text(row.id), requestId: text(row.request_id), requesterId: text(request.requester_id), craftsmanId: text(craftsman.user_id), estimateId: text(row.estimate_id), title: text(request.title), amount: Number(row.amount ?? 0), status: status(row.status), updatedAt: text(row.updated_at), timeline: events.map((event: unknown): TimelineEvent => { const item = record(event); return { id: text(item.id), status: status(item.status), actorId: text(item.actor_id), note: text(item.note), createdAt: text(item.created_at) } }) }
}

export function mapReview(row: Row): Review {
  const categories = record(row.categories)
  return { id: text(row.id), transactionId: nullableText(row.transaction_id), bookingId: nullableText(row.booking_id), orderId: nullableText(row.order_id), reviewerId: text(row.reviewer_id), revieweeId: text(row.reviewee_id), rating: Number(row.rating ?? 0), categories: { quality: Number(categories.quality ?? row.rating ?? 0), communication: Number(categories.communication ?? row.rating ?? 0), deadline: Number(categories.deadline ?? row.rating ?? 0), costPerformance: Number(categories.costPerformance ?? row.rating ?? 0) }, comment: text(row.comment), photos: strings(row.photos), createdAt: text(row.created_at) }
}

export function mapNotification(row: Row): Notification {
  const type: NotificationType = row.type === "request" || row.type === "estimate" || row.type === "message" || row.type === "review" || row.type === "ai" ? row.type : "system"
  return { id: text(row.id), userId: text(row.user_id), type, title: text(row.title), body: text(row.body), read: Boolean(row.read), createdAt: text(row.created_at) }
}

export function mapPortfolioItem(row: Row): PortfolioItem {
  return { id: text(row.id), craftsmanId: text(row.craftsman_id), title: text(row.title), description: text(row.description), image: text(row.image_url), tags: strings(row.tags) }
}

async function rows(client: SupabaseClient, table: string, select = "*"): Promise<Row[]> {
  const { data, error } = await client.from(table).select(select)
  if (error) throw new Error("データを読み込めませんでした。")
  return (data ?? []) as unknown as Row[]
}

export async function getUsers(client: SupabaseClient) { return (await rows(client, "profiles")).map(mapProfile) }
export async function getUserById(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("profiles").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error("プロフィールを読み込めませんでした。")
  return data ? mapProfile(data) : undefined
}
export async function getCraftsmen(client: SupabaseClient) {
  const { data, error } = await client.from("provider_profiles").select("*, profile:profiles(id,name,avatar_url), skills:provider_skills(skill:skills(*))")
  if (error) throw new Error("技能者を読み込めませんでした。")
  return (data ?? []).map(mapCraftsman)
}
export async function getCraftsmanById(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("provider_profiles").select("*, profile:profiles(id,name,avatar_url), skills:provider_skills(skill:skills(*))").eq("id", id).maybeSingle()
  if (error) throw new Error("技能者を読み込めませんでした。")
  return data ? mapCraftsman(data) : undefined
}
export async function getCraftsmanByUserId(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("provider_profiles").select("*, profile:profiles(id,name,avatar_url), skills:provider_skills(skill:skills(*))").eq("user_id", id).maybeSingle()
  if (error) throw new Error("技能者を読み込めませんでした。")
  return data ? mapCraftsman(data) : undefined
}
export async function getRequests(client: SupabaseClient, requesterId?: string) {
  let query = client.from("requests").select("*, spec:specifications(*)").order("created_at", { ascending: false })
  if (requesterId) query = query.eq("requester_id", requesterId)
  const { data, error } = await query
  if (error) throw new Error("案件を読み込めませんでした。")
  return (data ?? []).map(mapRequest)
}
export async function getRequestById(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("requests").select("*, spec:specifications(*)").eq("id", id).maybeSingle()
  if (error) throw new Error("案件を読み込めませんでした。")
  return data ? mapRequest(data) : undefined
}
export async function getMatchesForRequest(client: SupabaseClient, id: string): Promise<Match[]> {
  const { data, error } = await client.from("matches").select("*").eq("request_id", id)
  if (error) throw new Error("マッチングを読み込めませんでした。")
  return (data ?? []).map((row) => ({ id: row.id, requestId: row.request_id, craftsmanId: row.craftsman_id, score: row.score, status: row.status, reason: text(row.reason) }))
}
export async function getMessagesForRequest(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("messages").select("*").eq("request_id", id).order("created_at")
  if (error) throw new Error("メッセージを読み込めませんでした。")
  return (data ?? []).map(mapMessage)
}
export async function getEstimatesForRequest(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("estimates").select("*").eq("request_id", id).order("created_at")
  if (error) throw new Error("見積もりを読み込めませんでした。")
  return (data ?? []).map(mapEstimate)
}
export async function getEstimateById(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("estimates").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error("見積もりを読み込めませんでした。")
  return data ? mapEstimate(data) : undefined
}
export async function getTransactions(client: SupabaseClient) {
  const { data, error } = await client.from("transactions").select("*, request:requests(*), craftsman:provider_profiles(*), events:transaction_events(*)")
  if (error) throw new Error("取引を読み込めませんでした。")
  return (data ?? []).map(mapTransaction)
}
export async function getTransactionById(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("transactions").select("*, request:requests(*), craftsman:provider_profiles(*), events:transaction_events(*)").eq("id", id).maybeSingle()
  if (error) throw new Error("取引を読み込めませんでした。")
  return data ? mapTransaction(data) : undefined
}
export async function getPortfolioItems(client: SupabaseClient, craftsmanId?: string) {
  let query = client.from("portfolio_items").select("*").order("created_at", { ascending: false })
  if (craftsmanId) query = query.eq("craftsman_id", craftsmanId)
  const { data, error } = await query
  if (error) throw new Error("ポートフォリオを読み込めませんでした。")
  return (data ?? []).map(mapPortfolioItem)
}
export async function getNotifications(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (error) throw new Error("通知を読み込めませんでした。")
  return (data ?? []).map(mapNotification)
}
export async function getReviewsForUser(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("reviews").select("*").eq("reviewee_id", userId).order("created_at", { ascending: false })
  if (error) throw new Error("レビューを読み込めませんでした。")
  return (data ?? []).map(mapReview)
}

const nullableText = (value: unknown): string | null => typeof value === "string" ? value : null
const nullableNumber = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null
function enumValue<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new Error("保存されたデータが不正です。")
  return value as T
}

export function mapCategory(row: Row): Category {
  return {
    id: text(row.id), slug: text(row.slug), name: text(row.name), description: text(row.description),
    icon: nullableText(row.icon),
    supportedFulfillmentTypes: strings(row.supported_fulfillment_types).filter((value): value is FulfillmentType => value === "booking" || value === "order"),
    isPublic: row.is_public === true, requiresVerification: row.requires_verification === true,
    verificationNotes: text(row.verification_notes), displayOrder: Number(row.display_order ?? 0),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  }
}

export function mapListingImage(row: Row): ListingImage {
  return { id: text(row.id), listingId: text(row.listing_id), url: text(row.url), sortOrder: Number(row.sort_order ?? 0), createdAt: text(row.created_at) }
}

export function mapListing(row: Row): Listing {
  const category = relation(row.category)
  const coordinates = record(row.coordinates)
  const validCoordinates = typeof coordinates.lat === "number" && typeof coordinates.lng === "number"
  const listingStatus: ListingStatus = row.status === "published" || row.status === "paused" || row.status === "archived" ? row.status : "draft"
  return {
    id: text(row.id), providerId: text(row.provider_id), categoryId: text(row.category_id),
    fulfillmentType: row.fulfillment_type === "booking" ? "booking" : "order",
    title: text(row.title), description: text(row.description),
    priceBasis: row.price_basis === "fixed" || row.price_basis === "hourly" ? row.price_basis : "consultation",
    price: nullableNumber(row.price), serviceAreas: strings(row.service_areas), location: nullableText(row.location),
    coordinates: validCoordinates ? { lat: coordinates.lat as number, lng: coordinates.lng as number } : null,
    availability: record(row.availability), status: listingStatus,
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
    category: category.id ? mapCategory(category) : undefined,
    images: Array.isArray(row.images) ? row.images.map((image: unknown) => mapListingImage(record(image))) : [],
  }
}

export function mapBooking(row: Row): Booking {
  const bookingStatuses: BookingStatus[] = ["requested", "accepted", "cancelled_by_customer", "cancelled_by_provider", "completed", "reviewed"]
  return {
    id: text(row.id), listingId: text(row.listing_id), customerId: text(row.customer_id), providerUserId: text(row.provider_user_id),
    scheduledStart: text(row.scheduled_start), scheduledEnd: text(row.scheduled_end),
    placeType: row.place_type === "customer" || row.place_type === "online" ? row.place_type : "provider",
    placeNote: nullableText(row.place_note), amount: nullableNumber(row.amount),
    status: bookingStatuses.includes(row.status as BookingStatus) ? row.status as BookingStatus : "requested",
    cancelReason: nullableText(row.cancel_reason), createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  }
}

export function mapOrder(row: Row): Order {
  const orderStatuses: OrderStatus[] = ["consulting", "quoted", "ordered", "in_progress", "delivered", "accepted", "completed", "cancelled"]
  return {
    id: text(row.id), listingId: nullableText(row.listing_id), customerId: text(row.customer_id), providerProfileId: nullableText(row.provider_profile_id),
    title: text(row.title), description: text(row.description), specification: row.specification === null ? null : record(row.specification),
    status: orderStatuses.includes(row.status as OrderStatus) ? row.status as OrderStatus : "consulting",
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  }
}

export async function getCategories(client: SupabaseClient): Promise<Category[]> {
  const { data, error } = await client.from("categories").select("*").order("display_order")
  if (error) throw new Error("カテゴリを読み込めませんでした。")
  return (data ?? []).map(mapCategory)
}

export async function getListings(client: SupabaseClient): Promise<Listing[]> {
  const { data, error } = await client.from("listings").select("*, category:categories(*), images:listing_images(*)").order("created_at", { ascending: false })
  if (error) throw new Error("出品を読み込めませんでした。")
  return (data ?? []).map(mapListing)
}

export async function getListingById(client: SupabaseClient, id: string): Promise<Listing | undefined> {
  const { data, error } = await client.from("listings").select("*, category:categories(*), images:listing_images(*)").eq("id", id).maybeSingle()
  if (error) throw new Error("出品を読み込めませんでした。")
  return data ? mapListing(data) : undefined
}

export async function getBookings(client: SupabaseClient): Promise<Booking[]> {
  const { data, error } = await client.from("bookings").select("*").order("created_at", { ascending: false })
  if (error) throw new Error("予約を読み込めませんでした。")
  return (data ?? []).map(mapBooking)
}

export async function getOrders(client: SupabaseClient): Promise<Order[]> {
  const { data, error } = await client.from("orders").select("*").order("created_at", { ascending: false })
  if (error) throw new Error("注文を読み込めませんでした。")
  return (data ?? []).map(mapOrder)
}

export interface ListingValues {
  provider_id: string
  category_id: string
  fulfillment_type: FulfillmentType
  title: string
  description: string
  price_basis: "fixed" | "hourly" | "consultation"
  price: number | null
  service_areas: string[]
  location: string | null
  coordinates: { lat: number; lng: number } | null
  availability: Record<string, unknown>
  status: ListingStatus
}

export async function insertListing(client: SupabaseClient, values: ListingValues): Promise<Listing> {
  const { data, error } = await client.from("listings").insert(values).select("*, category:categories(*), images:listing_images(*)").single()
  if (error) throw new Error("出品を保存できませんでした。")
  return mapListing(data)
}

export async function updateListing(client: SupabaseClient, id: string, values: Partial<Omit<ListingValues, "provider_id">>): Promise<Listing> {
  const { data, error } = await client.from("listings").update(values).eq("id", id).select("*, category:categories(*), images:listing_images(*)").single()
  if (error) throw new Error("出品を更新できませんでした。")
  return mapListing(data)
}

export async function deleteListing(client: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await client.from("listings").delete().eq("id", id).select("id").maybeSingle()
  if (error || !data) throw new Error("出品を削除できませんでした。")
}

export async function insertListingImage(client: SupabaseClient, listingId: string, url: string, sortOrder: number): Promise<ListingImage> {
  const { data, error } = await client.from("listing_images").insert({ listing_id: listingId, url, sort_order: sortOrder }).select("*").single()
  if (error) throw new Error("出品画像を保存できませんでした。")
  return mapListingImage(data)
}

export async function deleteListingImage(client: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await client.from("listing_images").delete().eq("id", id).select("id").maybeSingle()
  if (error || !data) throw new Error("出品画像を削除できませんでした。")
}

export async function getTradeMessages(client: SupabaseClient, type: FulfillmentType, tradeId: string): Promise<TradeMessage[]> {
  const table = type === "booking" ? "booking_messages" : "order_messages"
  const column = type === "booking" ? "booking_id" : "order_id"
  const { data, error } = await client.from(table).select("*").eq(column, tradeId).order("created_at")
  if (error) throw new Error("メッセージを読み込めませんでした。")
  return (data ?? []).map((row) => ({ id: text(row.id), tradeId: text(row[column]), senderId: text(row.sender_id), text: text(row.text), attachments: Array.isArray(row.attachments) ? row.attachments as Attachment[] : [], readAt: nullableText(row.read_at), createdAt: text(row.created_at) }))
}

export async function insertTradeMessage(client: SupabaseClient, type: FulfillmentType, tradeId: string, senderId: string, message: string, attachments: Attachment[]) {
  const table = type === "booking" ? "booking_messages" : "order_messages"
  const column = type === "booking" ? "booking_id" : "order_id"
  const { data, error } = await client.from(table).insert({ [column]: tradeId, sender_id: senderId, text: message, attachments }).select("id").single()
  if (error) throw new Error("メッセージを送信できませんでした。")
  return data.id as string
}

export async function markTradeMessageRead(client: SupabaseClient, type: FulfillmentType, id: string): Promise<void> {
  const table = type === "booking" ? "booking_messages" : "order_messages"
  const { data, error } = await client.from(table).update({ read_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle()
  if (error || !data) throw new Error("既読状態を更新できませんでした。")
}

export async function getFavoriteListingIds(client: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await client.from("favorites").select("listing_id").eq("user_id", userId)
  if (error) throw new Error("お気に入りを読み込めませんでした。")
  return (data ?? []).map((row) => text(row.listing_id))
}

export async function getProviderByUserId(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("provider_profiles").select("*, profile:profiles(id,name,avatar_url), skills:provider_skills(skill:skills(*))").eq("user_id", userId).maybeSingle()
  if (error) throw new Error("提供者プロフィールを読み込めませんでした。")
  return data ? mapCraftsman(data) : undefined
}

export async function getBookingById(client: SupabaseClient, id: string): Promise<Booking | undefined> {
  const { data, error } = await client.from("bookings").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error("予約を読み込めませんでした。")
  return data ? mapBooking(data) : undefined
}

export async function getOrderById(client: SupabaseClient, id: string): Promise<Order | undefined> {
  const { data, error } = await client.from("orders").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error("注文を読み込めませんでした。")
  return data ? mapOrder(data) : undefined
}

export async function insertBooking(client: SupabaseClient, values: {
  listing_id: string; customer_id: string; provider_user_id: string; scheduled_start: string; scheduled_end: string;
  place_type: "provider" | "customer" | "online"; place_note: string | null; amount: number | null
}): Promise<string> {
  const { data, error } = await client.from("bookings").insert(values).select("id").single()
  if (error) throw new Error("予約を作成できませんでした。")
  return data.id as string
}

export async function insertOrder(client: SupabaseClient, values: {
  listing_id: string | null; provider_profile_id: string | null; customer_id: string; title: string; description: string; specification: Record<string, unknown> | null
}): Promise<string> {
  const { data, error } = await client.from("orders").insert(values).select("id").single()
  if (error) throw new Error("相談を作成できませんでした。")
  return data.id as string
}

export async function getProviderVerifiedCategories(client: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await client.rpc("provider_verified_categories", { target_user_id: userId })
  if (error) throw new Error("資格確認状況を読み込めませんでした。")
  return (data ?? []).map((row: Row) => text(row.category_id))
}

export async function getProviderVerifications(client: SupabaseClient): Promise<ProviderVerification[]> {
  const { data, error } = await client.from("provider_verifications").select("*").order("created_at", { ascending: false })
  if (error) throw new Error("資格確認申請を読み込めませんでした。")
  return (data ?? []).map((row) => ({ id: text(row.id), providerUserId: text(row.provider_user_id), categoryId: text(row.category_id), type: enumValue(row.type, ["license", "permit", "insurance", "training", "other"] as const), name: text(row.name), documentUrl: nullableText(row.document_url), status: enumValue(row.status, ["unsubmitted", "pending", "approved", "rejected"] as const), reviewedBy: nullableText(row.reviewed_by), reviewedAt: nullableText(row.reviewed_at), note: nullableText(row.note), createdAt: text(row.created_at) }))
}

export async function getReports(client: SupabaseClient): Promise<Report[]> {
  const { data, error } = await client.from("reports").select("*").order("created_at", { ascending: false })
  if (error) throw new Error("通報を読み込めませんでした。")
  return (data ?? []).map((row) => ({ id: text(row.id), reporterId: text(row.reporter_id), targetType: enumValue(row.target_type, ["listing", "profile", "booking", "order", "message", "review"] as const), targetId: text(row.target_id), reason: enumValue(row.reason, ["illegal", "fraud", "harassment", "adult", "off_platform_payment", "other"] as const), details: nullableText(row.details), status: enumValue(row.status, ["open", "reviewing", "actioned", "dismissed"] as const), handledBy: nullableText(row.handled_by), createdAt: text(row.created_at) }))
}
