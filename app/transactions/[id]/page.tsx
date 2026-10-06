import { notFound } from "next/navigation"
import { TransactionDetailClient } from "./transaction-detail-client"
import { getTransactionById } from "@/lib/demo-data"

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const transaction = getTransactionById(id)
  if (!transaction) return notFound()
  return <TransactionDetailClient id={id} />
}
