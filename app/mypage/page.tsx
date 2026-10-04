"use client"

import Link from "next/link"
import { Settings, History, Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/status-badge"
import {
  requests,
  skills,
  craftsmanProfiles,
  getUserById,
} from "@/lib/demo-data"

export default function MyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">マイページ</h1>
        <p className="mt-2 text-muted-foreground">
          依頼履歴、お気に入り、設定を管理できます。
        </p>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="rounded-xl">
          <TabsTrigger value="history" className="gap-1">
            <History className="h-4 w-4" />
            依頼履歴
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1">
            <Heart className="h-4 w-4" />
            お気に入り
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <div className="space-y-4">
            {requests.map((req) => (
              <Card key={req.id} className="rounded-2xl">
                <CardHeader className="flex-row items-start justify-between">
                  <div>
                    <CardTitle className="font-serif text-base">{req.title}</CardTitle>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {req.description}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/request/${req.id}/spec`}>仕様を見る</Link>
                  </Button>
                  {req.status === "matching" && (
                    <Button size="sm" asChild>
                      <Link href={`/request/${req.id}/matches`}>マッチング</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {requests.length === 0 && (
              <p className="text-muted-foreground">依頼履歴はありません。</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="favorites">
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="font-serif">お気に入りスキル</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="font-serif">お気に入り技能者</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {craftsmanProfiles.map((craftsman) => {
                  const user = getUserById(craftsman.userId)
                  return (
                    <div
                      key={craftsman.id}
                      className="flex items-center justify-between rounded-xl border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user?.avatar} alt={user?.name} />
                          <AvatarFallback>{user?.name?.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {craftsman.location}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/craftsman/${craftsman.id}`}>プロフィール</Link>
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-serif">アカウント設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">表示名</Label>
                <Input id="name" defaultValue="山田 太郎" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="yamada@example.com"
                  className="rounded-xl"
                />
              </div>
              <Separator />
              <Button>設定を保存</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
