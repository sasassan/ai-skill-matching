import { notFound } from "next/navigation"
import { OrderDetailClient } from "./order-detail-client"
import { getTransactionById } from "@/lib/demo-data"

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const transaction = getTransactionById(id)
  if (!transaction) return notFound()
  return <OrderDetailClient id={id} />
}
