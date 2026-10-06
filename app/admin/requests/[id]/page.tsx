import { AdminRequestDetailClient } from "./admin-request-detail-client"

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AdminRequestDetailClient id={id} />
}
