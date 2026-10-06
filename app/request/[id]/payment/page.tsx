import { notFound } from "next/navigation"
import { PaymentClient } from "./payment-client"
import { getRequestById, getTransactionById } from "@/lib/demo-data"

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ transactionId?: string }>
}) {
  const { id } = await params
  const { transactionId } = await searchParams
  const request = getRequestById(id)
  const transaction = transactionId ? getTransactionById(transactionId) : undefined
  if (!request || !transaction) return notFound()
  return <PaymentClient requestId={id} transactionId={transaction.id} />
}
