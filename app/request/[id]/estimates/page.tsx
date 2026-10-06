import { notFound } from "next/navigation"
import { EstimatesClient } from "./estimates-client"
import { getRequestById } from "@/lib/demo-data"

export default async function EstimatesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const request = getRequestById(id)
  if (!request) return notFound()
  return <EstimatesClient id={id} />
}
