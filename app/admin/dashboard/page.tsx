import Link from "next/link"
import { Users, FileText, Handshake, Activity } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { RoleBadge } from "@/components/role-badge"
import { requests, matches, users } from "@/lib/demo-data"

export default function AdminDashboardPage() {
  const pendingMatches = matches.filter((m) => m.status === "pending").length
  const totalRequests = requests.length
  const totalUsers = users.length

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">管理ダッシュボード</h1>
        <p className="mt-2 text-muted-foreground">
          マーケットプレイスの全体状況を確認できます。
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>総依頼数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-bold">{totalRequests}</p>
            <FileText className="mt-2 h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>マッチング待ち</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-bold">{pendingMatches}</p>
            <Handshake className="mt-2 h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>登録ユーザー</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-bold">{totalUsers}</p>
            <Users className="mt-2 h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>稼働率</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-bold">92%</p>
            <Activity className="mt-2 h-4 w-4 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-serif">最近の依頼</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/requests/r1">詳細</Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>案件名</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/requests/${req.id}`}>管理</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">最近のユーザー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.slice(0, 4).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <RoleBadge role={user.role} />
              </div>
            ))}
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/admin/users">ユーザー管理へ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-2xl">
        <CardHeader>
          <CardTitle className="font-serif">マッチングステータス</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>依頼ID</TableHead>
                <TableHead>技能者ID</TableHead>
                <TableHead>スコア</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell>{match.requestId}</TableCell>
                  <TableCell>{match.craftsmanId}</TableCell>
                  <TableCell>{match.score}%</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        match.status === "accepted"
                          ? "default"
                          : match.status === "declined"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {match.status === "pending" && "未対応"}
                      {match.status === "accepted" && "承諾"}
                      {match.status === "declined" && "辞退"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
