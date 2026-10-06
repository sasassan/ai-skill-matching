import { notFound } from "next/navigation"
import { ReviewFormClient } from "./review-form-client"
import { getRequestById, getTransactionById } from "@/lib/demo-data"

export default async function ReviewPage({
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
  if (!request) return notFound()
  return <ReviewFormClient requestId={id} transactionId={transaction?.id} />
}
