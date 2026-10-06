import { notFound } from "next/navigation"
import { EstimateDetailClient } from "./estimate-detail-client"
import { getEstimateById, getRequestById } from "@/lib/demo-data"

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string; estimateId: string }>
}) {
  const { id, estimateId } = await params
  const request = getRequestById(id)
  const estimate = getEstimateById(estimateId)
  if (!request || !estimate || estimate.requestId !== id) return notFound()
  return <EstimateDetailClient requestId={id} estimateId={estimateId} />
}
