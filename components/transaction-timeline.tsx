import { Check, Clock, Package, Truck, ThumbsUp, FileCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUserById, type TimelineEvent, type RequestStatus } from "@/lib/demo-data"
import { formatDate } from "@/lib/utils"

interface TransactionTimelineProps {
  timeline: TimelineEvent[]
  currentStatus: RequestStatus
}

const statusSteps: { status: RequestStatus; label: string; icon: React.ReactNode }[] = [
  { status: "quoted", label: "見積", icon: <FileCheck className="h-4 w-4" /> },
  { status: "contracted", label: "契約", icon: <Check className="h-4 w-4" /> },
  { status: "in_progress", label: "製作中", icon: <Clock className="h-4 w-4" /> },
  { status: "delivered", label: "納品", icon: <Truck className="h-4 w-4" /> },
  { status: "completed", label: "完了", icon: <ThumbsUp className="h-4 w-4" /> },
]

export function TransactionTimeline({
  timeline,
  currentStatus,
}: TransactionTimelineProps) {
  const currentIndex = statusSteps.findIndex((s) => s.status === currentStatus)

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle className="font-serif">取引タイムライン</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          {statusSteps.map((step, idx) => (
            <div key={step.status} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    idx <= currentIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.icon}
                </div>
                <span className="mt-1 text-xs">{step.label}</span>
              </div>
              {idx < statusSteps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    idx < currentIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {timeline.map((event) => {
            const actor = getUserById(event.actorId)
            const step = statusSteps.find((s) => s.status === event.status)
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-xl border p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {step?.icon}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{step?.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {actor?.name}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.note}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
