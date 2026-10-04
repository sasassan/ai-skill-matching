"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { requests, skills } from "@/lib/demo-data"

export default function CraftsmanJobsPage() {
  const [selectedSkill, setSelectedSkill] = useState<string | "all">("all")
  const [query, setQuery] = useState("")

  const filtered = requests.filter((req) => {
    const matchesSkill =
      selectedSkill === "all" ||
      (req.spec?.requiredSkills ?? []).includes(selectedSkill) ||
      req.title.includes(selectedSkill)
    const matchesQuery =
      query.trim() === "" ||
      req.title.includes(query) ||
      req.description.includes(query)
    return matchesSkill && matchesQuery
  })

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">おすすめ案件</h1>
        <p className="mt-2 text-muted-foreground">
          あなたのスキルにマッチした依頼を探しましょう。
        </p>
      </div>

      <Card className="mb-6 rounded-2xl">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="案件を検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-xl pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSkill === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSkill("all")}
            >
              すべて
            </Button>
            {skills.map((skill) => (
              <Button
                key={skill.id}
                variant={selectedSkill === skill.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSkill(skill.name)}
              >
                {skill.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((req) => (
          <Card key={req.id} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-serif text-base">{req.title}</CardTitle>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {req.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(req.spec?.requiredSkills ?? []).map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  予算: {req.spec?.budget ?? "相談"}
                </span>
                <span className="text-muted-foreground">
                  納期: {req.spec?.deadline ?? "相談"}
                </span>
              </div>
              <Button size="sm" asChild className="w-full gap-1">
                <Link href={`/craftsman/jobs/${req.id}`}>
                  詳細を見る
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            条件に合う案件がありません。
          </CardContent>
        </Card>
      )}
    </div>
  )
}
