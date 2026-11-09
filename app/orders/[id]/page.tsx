import { notFound, redirect } from "next/navigation"
import { MessageThread } from "@/components/message-thread"
import { ReviewForm } from "@/components/review-form"
import { StatusBadge } from "@/components/status-badge"
import { TradeActions } from "@/components/trade-actions"
import {
  getCraftsmanById,
  getOrderById,
  getTradeMessages,
  getReviewsForUser,
} from "@/lib/supabase-data"
import {
  createServerSupabaseClient,
  getServerProfile,
} from "@/lib/supabase-server"
import { stripeUnavailableMessage } from "@/lib/stripe"
import type { OrderStatus } from "@/lib/models"
export default async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerProfile().catch(() => null)
  if (!user) redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`)
  const db = await createServerSupabaseClient()
  const order = await getOrderById(db, id)
  if (!order) notFound()
  const provider = order.providerProfileId
    ? await getCraftsmanById(db, order.providerProfileId)
    : undefined
  if (user.id !== order.customerId && user.id !== provider?.userId) notFound()
  const [messages, reviews, quote] = await Promise.all([
    getTradeMessages(db, "order", id),
    provider
      ? getReviewsForUser(
          db,
          user.id === order.customerId ? provider.userId : order.customerId
        )
      : [],
    db
      .from("order_quotes")
      .select("amount,description")
      .eq("order_id", id)
      .maybeSingle(),
  ])
  if (quote.error) throw new Error("見積もりを読み込めませんでした。")
  const options: { status: OrderStatus; label: string }[] = []
  if (user.id === order.customerId && order.status === "quoted")
    options.push({ status: "ordered", label: "見積もりを承認" })
  if (user.id === provider?.userId && order.status === "ordered")
    options.push({ status: "in_progress", label: "制作を開始" })
  if (user.id === provider?.userId && order.status === "in_progress")
    options.push({ status: "delivered", label: "納品する" })
  if (user.id === order.customerId && order.status === "delivered")
    options.push({ status: "completed", label: "検収して完了" })
  if (
    ["consulting", "quoted", "ordered", "in_progress", "delivered"].includes(
      order.status
    )
  )
    options.push({ status: "cancelled", label: "相談をキャンセル" })
  const reviewed = reviews.some(
    (review) => review.orderId === id && review.reviewerId === user.id
  )
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">{order.title}</h1>
      <div className="mt-4">
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-5 leading-8 whitespace-pre-wrap">{order.description}</p>
      {order.specification && (
        <p className="mt-4 text-sm">
          予算: {String(order.specification.budget || "未指定")} / 希望納期:{" "}
          {String(order.specification.deadline || "未指定")}
        </p>
      )}
      {quote.data && (
        <div className="mt-5 rounded-xl border bg-card p-5">
          <h2 className="font-bold">
            見積もり: ¥{quote.data.amount.toLocaleString()}
          </h2>
          <p className="mt-2 whitespace-pre-wrap">{quote.data.description}</p>
        </div>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        {stripeUnavailableMessage}
      </p>
      <TradeActions
        type="order"
        tradeId={id}
        options={options}
        quote={order.status === "consulting" && user.id === provider?.userId}
      />
      <MessageThread
        type="order"
        tradeId={id}
        messages={messages}
        userId={user.id}
      />
      {order.status === "completed" && !reviewed && (
        <ReviewForm type="order" tradeId={id} />
      )}
    </div>
  )
}
