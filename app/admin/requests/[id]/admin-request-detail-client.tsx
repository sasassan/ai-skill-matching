"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  GripVertical,
  HandHelping,
  ListTodo,
  MessageSquare,
  Save,
  UserCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/status-badge"
import {
  getRequestById,
  getMatchesForRequest,
  getCraftsmanById,
  getUserById,
  craftsmanProfiles,
  type RequestStatus,
} from "@/lib/demo-data"
import { cn } from "@/lib/utils"

const REQUEST_STATUSES: RequestStatus[] = [
  "draft",
  "structured",
  "matching",
  "quoted",
  "contracted",
  "in_progress",
  "delivered",
  "completed",
]

const statusLabel: Record<RequestStatus, string> = {
  draft: "下書き",
  structured: "仕様確定",
  matching: "マッチング中",
  quoted: "見積り中",
  contracted: "契約済",
  in_progress: "製作中",
  delivered: "納品済",
  completed: "完了",
}

export function AdminRequestDetailClient({ id }: { id: string }) {
  const request = getRequestById(id)
  const matches = getMatchesForRequest(id).sort((a, b) => b.score - a.score)
  const [selectedCraftsman, setSelectedCraftsman] = useState<string | null>(null)
  const [assignedCraftsmanId, setAssignedCraftsmanId] = useState<string | null>(null)
  const [assignmentReason, setAssignmentReason] = useState("")
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(
    request?.status ?? "matching"
  )
  const [dragOver, setDragOver] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">依頼が見つかりません</h1>
      </div>
    )
  }

  const spec = request.spec
  const assignedCraftsman = assignedCraftsmanId
    ? getCraftsmanById(assignedCraftsmanId)
    : undefined
  const assignedUser = assignedCraftsman
    ? getUserById(assignedCraftsman.userId)
    : undefined

  const handleAssignClick = (craftsmanId: string) => {
    setAssignedCraftsmanId(craftsmanId)
  }

  const handleDragStart = (e: React.DragEvent, craftsmanId: string) => {
    setDraggingId(craftsmanId)
    e.dataTransfer.setData("text/plain", craftsmanId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const craftsmanId = e.dataTransfer.getData("text/plain")
    if (craftsmanId) {
      setAssignedCraftsmanId(craftsmanId)
    }
    setDraggingId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const applyStatus = () => {
    alert(`依頼ステータスを「${statusLabel[requestStatus]}」に変更しました（デモ）`)
  }

  const saveAssignment = () => {
    if (!assignedCraftsmanId) {
      alert("先に技能者を選択してください")
      return
    }
    alert(
      `${assignedUser?.name ?? "技能者"} に割当を確定しました（デモ）\n理由：${assignmentReason || "（記載なし）"}`
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/admin/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">{request.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={requestStatus} />
          <span className="text-sm text-muted-foreground">ID: {request.id}</span>
        </div>
      </div>

      <Card className="mb-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">依頼内容</CardTitle>
          <CardDescription>{request.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {spec && (
            <div className="rounded-xl bg-muted p-4">
              <h3 className="mb-2 font-serif font-medium">AI仕様書</h3>
              <p className="text-sm">{spec.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {spec.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <span>予算: {spec.budget}</span>
                <span>納期: {spec.deadline}</span>
                <span className="sm:col-span-2">備考: {spec.notes}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">マッチング候補</CardTitle>
          <CardDescription>
            AIが推定した候補技能者一覧です。候補をドラッグ＆ドロップ、またはワンクリックで割当てられます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {matches.map((match) => {
            const craftsman = getCraftsmanById(match.craftsmanId)
            const user = craftsman ? getUserById(craftsman.userId) : undefined
            if (!craftsman || !user) return null
            const isDragging = draggingId === match.craftsmanId
            const isAssigned = assignedCraftsmanId === match.craftsmanId

            return (
              <div
                key={match.id}
                draggable
                onDragStart={(e) => handleDragStart(e, match.craftsmanId)}
                onDragEnd={() => setDraggingId(null)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 transition-opacity",
                  isDragging && "opacity-50",
                  isAssigned
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground active:cursor-grabbing" />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{craftsman.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="default">マッチ度 {match.score}%</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant={isAssigned ? "secondary" : "default"}
                    onClick={() => handleAssignClick(match.craftsmanId)}
                    className="gap-1"
                  >
                    {isAssigned ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        選択中
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        割当
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
          {matches.length === 0 && (
            <p className="text-muted-foreground">候補がまだありません。</p>
          )}
        </CardContent>
      </Card>

      <Card
        className={cn(
          "mb-6 rounded-2xl border-2 border-dashed transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <HandHelping className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 font-medium">ここにドラッグして割当</p>
          <p className="text-xs text-muted-foreground">
            候補をこのエリアにドロップすると、担当技能者として仮割当されます。
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">手動アサイン</CardTitle>
          <CardDescription>
            プルダウンから技能者を選んで依頼をアサインします。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={selectedCraftsman ?? ""}
            onValueChange={setSelectedCraftsman}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="技能者を選択" />
            </SelectTrigger>
            <SelectContent>
              {craftsmanProfiles.map((craftsman) => {
                const user = getUserById(craftsman.userId)
                return (
                  <SelectItem key={craftsman.id} value={craftsman.id}>
                    {user?.name}（{craftsman.location}）
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Button
            disabled={!selectedCraftsman}
            onClick={() => {
              if (selectedCraftsman) {
                setAssignedCraftsmanId(selectedCraftsman)
                alert(`${selectedCraftsman} にアサインしました（デモ）`)
              }
            }}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            アサインする
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">マッチング理由メモ</CardTitle>
          <CardDescription>
            なぜこの技能者を選んだのか、依頼者や内部で共有するメモを残せます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignedCraftsmanId && assignedUser && (
            <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={assignedUser.avatar} alt={assignedUser.name} />
                <AvatarFallback>{assignedUser.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{assignedUser.name}</p>
                <p className="text-xs text-muted-foreground">
                  {assignedCraftsman?.location}
                </p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reason">
              <MessageSquare className="mr-1 inline h-4 w-4" />
              マッチング理由
            </Label>
            <Textarea
              id="reason"
              rows={3}
              value={assignmentReason}
              onChange={(e) => setAssignmentReason(e.target.value)}
              placeholder="例：収納ボックスの実績が多数あり、3Dプリンターも保有しているため。"
              className="resize-none rounded-xl"
            />
          </div>
          <Button
            type="button"
            onClick={saveAssignment}
            disabled={!assignedCraftsmanId}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            割当を確定
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">案件ステータス一括変更</CardTitle>
          <CardDescription>
            この案件のステータスを変更します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="status">
                <ListTodo className="mr-1 inline h-4 w-4" />
                新しいステータス
              </Label>
              <Select
                value={requestStatus}
                onValueChange={(value) => setRequestStatus(value as RequestStatus)}
              >
                <SelectTrigger id="status" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabel[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={applyStatus}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              ステータスを変更
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
