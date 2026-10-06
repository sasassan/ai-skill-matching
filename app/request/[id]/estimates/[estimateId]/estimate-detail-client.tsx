"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { EstimatePreview } from "@/components/estimate-preview"
import { estimates } from "@/lib/demo-data"

export function EstimateDetailClient({
  requestId,
  estimateId,
}: {
  requestId: string
  estimateId: string
}) {
  const router = useRouter()

  const handleApprove = () => {
    const estimate = estimates.find((e) => e.id === estimateId)
    if (estimate) {
      estimate.status = "accepted"
      estimates
        .filter((e) => e.requestId === requestId && e.id !== estimateId)
        .forEach((e) => {
          e.status = "rejected"
        })
    }
    toast.success("見積もりを承認しました。取引画面へ進みます。")
    router.push(`/transactions`)
  }

  const handleReject = () => {
    const estimate = estimates.find((e) => e.id === estimateId)
    if (estimate) estimate.status = "rejected"
    toast.info("見積もりを却下しました。")
    router.refresh()
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <EstimatePreview
        estimateId={estimateId}
        showActions
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}
