import { notFound, redirect } from "next/navigation"
import { MessageThread } from "@/components/message-thread"
import { ReviewForm } from "@/components/review-form"
import { StatusBadge } from "@/components/status-badge"
import { TradeActions } from "@/components/trade-actions"
import { PaymentForm, RetryTransfer } from "@/components/payment-form"
import {
  getBookingById,
  getTradeMessages,
  getReviewsForUser,
} from "@/lib/supabase-data"
import {
  createServerSupabaseClient,
  getServerProfile,
} from "@/lib/supabase-server"
import { stripePaymentEnabled, stripeUnavailableMessage } from "@/lib/stripe"
import type { BookingStatus } from "@/lib/models"
export default async function BookingDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ message_failed?: string }>
}) {
  const { id } = await params
  const user = await getServerProfile().catch(() => null)
  if (!user) redirect(`/login?next=${encodeURIComponent(`/bookings/${id}`)}`)
  const db = await createServerSupabaseClient()
  const booking = await getBookingById(db, id)
  if (
    !booking ||
    ![booking.customerId, booking.providerUserId].includes(user.id)
  )
    notFound()
  const [messages, reviews] = await Promise.all([
    getTradeMessages(db, "booking", id),
    getReviewsForUser(
      db,
      user.id === booking.customerId
        ? booking.providerUserId
        : booking.customerId
    ),
  ])
  const paymentResult = stripePaymentEnabled ? await db.from("payments").select("status,amount").eq("booking_id", id).maybeSingle() : null
  if (paymentResult?.error) throw new Error("支払い状態を読み込めませんでした。")
  const payment = paymentResult?.data
  const options: { status: BookingStatus; label: string }[] = []
  if (booking.status === "requested" && booking.providerUserId === user.id)
    options.push({ status: "accepted", label: "予約を承認" })
  if (
    ["requested", "accepted"].includes(booking.status) &&
    (!payment || ["failed", "refunded"].includes(payment.status)) &&
    new Date(booking.scheduledStart).getTime() > Date.now()
  )
    options.push({
      status:
        user.id === booking.customerId
          ? "cancelled_by_customer"
          : "cancelled_by_provider",
      label: "予約をキャンセル",
    })
  if (
    booking.status === "accepted" &&
    new Date(booking.scheduledEnd).getTime() <= Date.now()
  )
    options.push({ status: "completed", label: "完了にする" })
  const reviewed = reviews.some(
    (review) => review.bookingId === id && review.reviewerId === user.id
  )
  const query = await searchParams
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">予約詳細</h1>
      <div className="mt-4">
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-5">
        {new Date(booking.scheduledStart).toLocaleString("ja-JP")} 〜{" "}
        {new Date(booking.scheduledEnd).toLocaleString("ja-JP")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {booking.placeNote || "場所は取引相手とご確認ください。"}
      </p>
      {!stripePaymentEnabled ? <p className="mt-3 text-sm text-muted-foreground">{stripeUnavailableMessage}</p> : <>
        {booking.amount != null && <p className="mt-3">料金：¥{booking.amount.toLocaleString()}</p>}
        {payment && <p className="mt-3 text-sm">支払い状態：{payment.status === "pending" ? "処理待ち" : payment.status === "captured" ? "支払い済み・サービス完了待ち" : payment.status === "transferred" ? "提供者へ送金済み" : payment.status}</p>}
        {user.id === booking.customerId && booking.status === "accepted" && (!payment || payment.status === "pending") && <PaymentForm type="booking" tradeId={id} publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!} />}
        {["completed", "reviewed"].includes(booking.status) && payment && ["captured", "transferring"].includes(payment.status) && <RetryTransfer type="booking" tradeId={id} />}
        {payment && !["failed", "refunded"].includes(payment.status) && !["completed", "reviewed"].includes(booking.status) && <p className="mt-3 text-sm">支払い手続き後のキャンセル・返金は管理者にお問い合わせください。</p>}
      </>}
      {query.message_failed && (
        <p role="alert" className="mt-3 text-destructive">
          予約は作成されましたが、メッセージを送信できませんでした。下のフォームから再送してください。
        </p>
      )}
      <TradeActions type="booking" tradeId={id} options={options} />
      <MessageThread
        type="booking"
        tradeId={id}
        messages={messages}
        userId={user.id}
      />
      {["completed", "reviewed"].includes(booking.status) && !reviewed && (
        <ReviewForm type="booking" tradeId={id} />
      )}
    </div>
  )
}
