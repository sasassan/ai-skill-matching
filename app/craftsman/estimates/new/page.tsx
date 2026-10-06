import { Suspense } from "react"
import { NewEstimateForm } from "./new-estimate-form"

export default function NewEstimatePage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-10">読み込み中...</div>}>
      <NewEstimateForm />
    </Suspense>
  )
}
