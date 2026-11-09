export type UserRole = "user" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string
  verified: boolean
}

export interface Skill {
  id: string
  name: string
  category: string
}

export interface Coordinates {
  lat: number
  lng: number
}

export interface CraftsmanProfile {
  id: string
  userId: string
  name: string
  avatar: string
  bio: string
  location: string
  prefecture: string
  coordinates: Coordinates
  serviceAreas: string[]
  skills: Skill[]
  equipment: string[]
  materials: string[]
  specialSkills: string[]
  specialSkillsNote: string
  qualifications: string[]
  experienceYears: string
  rating: number
  reviewCount: number
  completedOrders: number
  hourlyRate?: number
}

export interface PortfolioItem {
  id: string
  craftsmanId: string
  title: string
  description: string
  image: string
  tags: string[]
}

export type RequestStatus =
  | "draft"
  | "structured"
  | "matching"
  | "quoted"
  | "contracted"
  | "in_progress"
  | "delivered"
  | "completed"

export interface RequestSpec {
  id: string
  requestId: string
  title: string
  summary: string
  category: string
  requiredSkills: string[]
  materials: string[]
  budget: string
  deadline: string
  notes: string
}

export interface ProjectRequest {
  id: string
  requesterId: string
  title: string
  description: string
  status: RequestStatus
  image?: string
  createdAt: string
  spec?: RequestSpec
}

export interface Match {
  id: string
  requestId: string
  craftsmanId: string
  score: number
  status: "pending" | "accepted" | "declined"
  reason: string
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: "image" | "file"
  size?: string
}

export interface Message {
  id: string
  requestId: string
  senderId: string
  text: string
  createdAt: string
  readAt?: string
  attachments?: Attachment[]
}

export interface EstimateItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  note?: string
}

export type EstimateStatus = "pending" | "accepted" | "rejected"

export interface Estimate {
  id: string
  requestId: string
  craftsmanId: string
  items: EstimateItem[]
  subtotal: number
  tax: number
  total: number
  description: string
  notes?: string
  validUntil: string
  status: EstimateStatus
  createdAt: string
}

export interface TimelineEvent {
  id: string
  status: RequestStatus
  actorId: string
  note: string
  createdAt: string
}

export interface Transaction {
  id: string
  requestId: string
  requesterId: string
  craftsmanId: string
  estimateId: string
  title: string
  amount: number
  status: RequestStatus
  updatedAt: string
  timeline: TimelineEvent[]
}

export interface ReviewCategoryScores {
  quality: number
  communication: number
  deadline: number
  costPerformance: number
}

export interface Review {
  id: string
  transactionId: string | null
  bookingId: string | null
  orderId: string | null
  reviewerId: string
  revieweeId: string
  rating: number
  categories: ReviewCategoryScores
  comment: string
  photos?: string[]
  createdAt: string
}

export type EscrowStatus = "unpaid" | "held" | "released" | "refunded"

export interface EscrowPayment {
  id: string
  transactionId: string
  requesterId: string
  craftsmanId: string
  amount: number
  platformFee: number
  craftsmanAmount: number
  status: EscrowStatus
  paidAt?: string
  releasedAt?: string
}

export type NotificationType = "request" | "estimate" | "message" | "review" | "ai" | "system"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
}

export type FulfillmentType = "booking" | "order"
export type ListingStatus = "draft" | "published" | "paused" | "archived"
export type BookingStatus = "requested" | "accepted" | "cancelled_by_customer" | "cancelled_by_provider" | "completed" | "reviewed"
export type OrderStatus = "consulting" | "quoted" | "ordered" | "in_progress" | "delivered" | "accepted" | "completed" | "cancelled"
export type VerificationStatus = "unsubmitted" | "pending" | "approved" | "rejected"

export interface Category {
  id: string
  slug: string
  name: string
  description: string
  icon: string | null
  supportedFulfillmentTypes: FulfillmentType[]
  isPublic: boolean
  requiresVerification: boolean
  verificationNotes: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type ProviderProfile = CraftsmanProfile

export interface ListingImage {
  id: string
  listingId: string
  url: string
  sortOrder: number
  createdAt: string
}

export interface Listing {
  id: string
  providerId: string
  categoryId: string
  fulfillmentType: FulfillmentType
  title: string
  description: string
  priceBasis: "fixed" | "hourly" | "consultation"
  price: number | null
  serviceAreas: string[]
  location: string | null
  coordinates: Coordinates | null
  availability: Record<string, unknown>
  status: ListingStatus
  createdAt: string
  updatedAt: string
  category?: Category
  images?: ListingImage[]
}

export interface Booking {
  id: string
  listingId: string
  customerId: string
  providerUserId: string
  scheduledStart: string
  scheduledEnd: string
  placeType: "provider" | "customer" | "online"
  placeNote: string | null
  amount: number | null
  status: BookingStatus
  cancelReason: string | null
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  listingId: string | null
  customerId: string
  providerProfileId: string | null
  title: string
  description: string
  specification: Record<string, unknown> | null
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

export interface TradeMessage {
  id: string
  tradeId: string
  senderId: string
  text: string
  attachments: Attachment[]
  readAt: string | null
  createdAt: string
}

export interface Favorite {
  userId: string
  listingId: string
  createdAt: string
}

export interface Report {
  id: string
  reporterId: string
  targetType: "listing" | "profile" | "booking" | "order" | "message" | "review"
  targetId: string
  reason: "illegal" | "fraud" | "harassment" | "adult" | "off_platform_payment" | "other"
  details: string | null
  status: "open" | "reviewing" | "actioned" | "dismissed"
  handledBy: string | null
  createdAt: string
}

export interface ProviderVerification {
  id: string
  providerUserId: string
  categoryId: string
  type: "license" | "permit" | "insurance" | "training" | "other"
  name: string
  documentUrl: string | null
  status: VerificationStatus
  reviewedBy: string | null
  reviewedAt: string | null
  note: string | null
  createdAt: string
}
