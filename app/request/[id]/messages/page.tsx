import { RequestMessagesClient } from "./request-messages-client"

export default async function RequestMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <RequestMessagesClient id={id} />
}
