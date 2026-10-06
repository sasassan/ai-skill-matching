"use server"

import OpenAI from "openai"
import {
  type CraftsmanProfile,
  type ProjectRequest,
  getCraftsmanById,
  getUserById,
} from "./demo-data"

const MODEL = "gpt-4o-mini"

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

export interface StructuredRequest {
  title: string
  category: string
  summary: string
  requiredSkills: string[]
  materials: string[]
  budget: string
  deadline: string
  notes: string
}

export async function structureRequest(input: string): Promise<StructuredRequest> {
  const client = getClient()
  if (!client) return demoStructureRequest(input)

  const system =
    "あなたは日本の職人・技能マッチングプラットフォームのAIアシスタントです。" +
    "依頼者の自然言語入力から、職人が判断できるように案件を構造化してください。" +
    "JSONのみを出力してください。"

  const prompt = `依頼内容：
"""${input}"""

以下のJSONスキーマで回答してください。
{
  "title": "簡潔な案件タイトル",
  "category": "カテゴリ（例：車両内装カスタム、家具製作、金属加工）",
  "summary": "依頼の要約（100文字程度）",
  "requiredSkills": ["必要な技能を配列で（木工、金属加工、溶接、CAD、縫製など）"],
  "materials": ["想定される素材・部材を配列で"],
  "budget": "予算帯の推定（例：10万円〜15万円）",
  "deadline": "納期の推定（例：2026年12月中旬）",
  "notes": "注意事項や補足（防水、軽量、法規制など）"
}`

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}"
  return normalizeStructuredRequest(safeJsonParse<unknown>(raw), input)
}

function normalizeStructuredRequest(parsed: unknown, input: string): StructuredRequest {
  const raw = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  return {
    title: stringField(raw.title) || "AIが生成したタイトル",
    category: stringField(raw.category) || "未分類",
    summary: stringField(raw.summary) || `${input.slice(0, 40)}...に基づく要約`,
    requiredSkills: stringArray(raw.requiredSkills),
    materials: stringArray(raw.materials),
    budget: stringField(raw.budget) || "未定",
    deadline: stringField(raw.deadline) || "未定",
    notes: stringField(raw.notes) || "",
  }
}

function demoStructureRequest(input: string): StructuredRequest {
  return {
    title: "AIが生成したタイトル",
    category: "車両内装カスタム（収納）",
    summary: `${input.slice(0, 40)}...に基づく要約`,
    requiredSkills: ["木工", "CAD設計", "樹脂成型"],
    materials: ["合板", "滑り止めフェルト", "取っ手金具"],
    budget: "15万円〜25万円",
    deadline: "2026年12月中旬",
    notes: "防水加工・軽量設計が望ましい。（デモモード）",
  }
}

export async function generateSpecification(
  input: string,
  structured: StructuredRequest
): Promise<string> {
  const client = getClient()
  if (!client) return demoGenerateSpecification(input, structured)

  const system =
    "あなたは日本の職人・技能マッチングプラットフォームのAIアシスタントです。" +
    "依頼内容と構造化結果から、職人が見積もり・判断できる仕様書をMarkdownで作成してください。"

  const prompt = `依頼者入力：
"""${input}"""

構造化結果：
- タイトル：${structured.title}
- カテゴリ：${structured.category}
- 要約：${structured.summary}
- 必要技能：${structured.requiredSkills.join("、")}
- 素材・部材：${structured.materials.join("、")}
- 予算：${structured.budget}
- 納期：${structured.deadline}
- 注意事項：${structured.notes}

以下の構成でMarkdown形式の仕様書を出力してください。
- 依頼内容
- 用途
- 希望サイズ（可能な範囲で推定）
- 必須条件
- 推奨素材・加工法
- 予算
- 希望納期
- その他備考`

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  })

  return completion.choices[0]?.message?.content?.trim() || demoGenerateSpecification(input, structured)
}

function demoGenerateSpecification(input: string, structured: StructuredRequest): string {
  return `【依頼内容】
${input}

【タイトル】
${structured.title}

【カテゴリ】
${structured.category}

【用途】
${structured.summary}

【希望サイズ】
依頼内容からのフルオーダー。詳細は打ち合わせにて確定。

【必須条件】
${structured.requiredSkills.map((s) => `- ${s}`).join("\n")}

【推奨素材・加工法】
${structured.materials.map((m) => `- ${m}`).join("\n")}

【予算】
${structured.budget}

【希望納期】
${structured.deadline}

【その他備考】
${structured.notes || "特になし（デモモード）"}`
}

export interface MatchingScore {
  craftsmanId: string
  score: number
  reason: string
}

export async function scoreMatching(
  spec: StructuredRequest,
  craftsmanIds: string[]
): Promise<MatchingScore[]> {
  const profiles = craftsmanIds
    .map((id) => {
      const p = getCraftsmanById(id)
      const u = p ? getUserById(p.userId) : undefined
      return p && u ? { id, profile: p, user: u } : null
    })
    .filter(Boolean) as { id: string; profile: CraftsmanProfile; user: { name: string } }[]

  const client = getClient()
  if (!client) return demoScoreMatching(spec, profiles)

  const system =
    "あなたは日本の職人・技能マッチングプラットフォームのAIマッチングエンジンです。" +
    "案件の必要技能と技能者プロフィールを照合し、マッチングスコアと具体的な理由を日本語で出力してください。"

  const prompt = `案件：
- タイトル：${spec.title}
- カテゴリ：${spec.category}
- 必要技能：${spec.requiredSkills.join("、")}
- 素材：${spec.materials.join("、")}
- 予算：${spec.budget}
- 納期：${spec.deadline}
- 備考：${spec.notes}

技能者一覧：
${profiles
  .map(
    ({ id, profile, user }) =>
      `- ID: ${id}\n  名前: ${user.name}\n  地域: ${profile.location} / 対応エリア: ${profile.serviceAreas.join("、")}\n  技能: ${profile.skills.map((s) => s.name).join("、")}\n  設備: ${profile.equipment.join("、")}\n  素材: ${profile.materials.join("、")}\n  実績: 受注${profile.completedOrders}件 / 評価${profile.rating}\n  こんなこともできます: ${profile.specialSkills.join("、")}`
  )
  .join("\n\n")}

以下のJSONスキーマで回答してください。
{
  "matches": [
    {
      "craftsmanId": "ID",
      "score": 0-100の整数,
      "reason": "日本語で具体的なマッチ理由（何の技能・設備・経験が合致しているか）"
    }
  ]
}`

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{\"matches\":[]}"
  const parsed = safeJsonParse<Record<string, unknown>>(raw)
  const list = Array.isArray(parsed?.matches) ? (parsed.matches as unknown[]) : []

  const resultMap = new Map<string, MatchingScore>()
  for (const item of list) {
    if (!item || typeof item !== "object") continue
    const it = item as Record<string, unknown>
    const id = stringField(it.craftsmanId)
    if (!id) continue
    resultMap.set(id, {
      craftsmanId: id,
      score: clampScore(numberField(it.score)),
      reason: stringField(it.reason) || "マッチング理由を生成できませんでした。",
    })
  }

  return profiles.map(({ id }) =>
    resultMap.get(id) ?? {
      craftsmanId: id,
      score: 50,
      reason: "スコアリング情報が不足しています。",
    }
  )
}

function demoScoreMatching(
  spec: StructuredRequest,
  profiles: { id: string; profile: CraftsmanProfile; user: { name: string } }[]
): MatchingScore[] {
  const required = new Set(spec.requiredSkills.map((s) => s.toLowerCase()))
  const materials = new Set(spec.materials.map((m) => m.toLowerCase()))

  const scored = profiles.map(({ id, profile, user }) => {
    const skillHits = profile.skills.filter((s) => required.has(s.name.toLowerCase())).length
    const materialHits = profile.materials.filter((m) => materials.has(m.toLowerCase())).length
    const specialHits = profile.specialSkills.filter((sp) =>
      [...required].some((r) => sp.toLowerCase().includes(r))
    ).length

    const matchedSkills = profile.skills
      .filter((s) => required.has(s.name.toLowerCase()))
      .map((s) => s.name)
    const matchedMaterials = profile.materials.filter((m) => materials.has(m.toLowerCase()))

    const base = 40 + skillHits * 20 + materialHits * 10 + specialHits * 10
    const score = clampScore(base)

    const reasons: string[] = []
    if (matchedSkills.length) reasons.push(`${matchedSkills.join("、")}の技能を保有`)
    if (matchedMaterials.length) reasons.push(`${matchedMaterials.join("、")}の素材に対応可`)
    if (profile.completedOrders > 50) reasons.push(`実績${profile.completedOrders}件で信頼性あり`)
    if (profile.serviceAreas.includes("東京都")) reasons.push("関東エリアで対応可能")

    const reason =
      reasons.length > 0
        ? `${user.name}は${reasons.join("、")}。（デモモード）`
        : `${user.name}は部分的に対応可能です。（デモモード）`

    return { craftsmanId: id, score, reason }
  })

  return scored.sort((a, b) => b.score - a.score)
}

export interface Opportunity {
  requestId: string
  title: string
  reason: string
}

export async function discoverOpportunities(
  craftsman: CraftsmanProfile,
  openRequests: ProjectRequest[]
): Promise<Opportunity[]> {
  if (openRequests.length === 0) return []
  const client = getClient()
  if (!client) return demoDiscoverOpportunities(craftsman, openRequests)

  const system =
    "あなたは技能者の可能性を発掘するAIアシスタントです。" +
    "技能者のプロフィールから、本人が気づいていない対応可能案件を提案してください。"

  const prompt = buildOpportunitiesPrompt(craftsman, openRequests)

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{\"opportunities\":[]}"
  const parsed = safeJsonParse<Record<string, unknown>>(raw)
  const list = Array.isArray(parsed?.opportunities) ? (parsed.opportunities as unknown[]) : []

  return normalizeOpportunities(list, openRequests)
}

function demoDiscoverOpportunities(
  craftsman: CraftsmanProfile,
  openRequests: ProjectRequest[]
): Opportunity[] {
  const craftsmanSkillNames = new Set(craftsman.skills.map((s) => s.name.toLowerCase()))

  return openRequests
    .filter((req) => {
      const skills = req.spec?.requiredSkills ?? []
      return skills.some((s) => craftsmanSkillNames.has(s.toLowerCase()))
    })
    .map((req) => {
      const matched =
        req.spec?.requiredSkills.filter((s) => craftsmanSkillNames.has(s.toLowerCase())) ?? []
      const specialReason = craftsman.specialSkills.find((sp) =>
        (req.spec?.requiredSkills ?? []).some((r) => sp.toLowerCase().includes(r.toLowerCase()))
      )
      const reasons = [`${matched.join("、")}の技能が対応可能`]
      if (specialReason) reasons.push(`「${specialReason}」の実績が活かせる`)
      return {
        requestId: req.id,
        title: req.title,
        reason: reasons.join("、") + "（デモモード）",
      }
    })
    .slice(0, 3)
}

export interface ReverseMatchRecommendation extends Opportunity {
  score: number
}

export async function reverseMatch(
  craftsman: CraftsmanProfile,
  newRequests: ProjectRequest[]
): Promise<ReverseMatchRecommendation[]> {
  if (newRequests.length === 0) return []
  const client = getClient()
  if (!client) return demoReverseMatch(craftsman, newRequests)

  const system =
    "あなたは技能者に向けた新規案件通知AIです。" +
    "技能者の技能に適した新規案件をスコア付きで推薦してください。"

  const prompt = buildOpportunitiesPrompt(craftsman, newRequests) +
    "\n\nさらに、各提案に0-100の推薦スコア（score）を付与してください。"

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{\"opportunities\":[]}"
  const parsed = safeJsonParse<Record<string, unknown>>(raw)
  const list = Array.isArray(parsed?.opportunities) ? (parsed.opportunities as unknown[]) : []

  return normalizeOpportunities(list, newRequests).map((opp) => ({
    ...opp,
    score: 80,
  }))
}

function demoReverseMatch(
  craftsman: CraftsmanProfile,
  newRequests: ProjectRequest[]
): ReverseMatchRecommendation[] {
  return demoDiscoverOpportunities(craftsman, newRequests).map((opp) => ({
    ...opp,
    score: 85,
  }))
}

function buildOpportunitiesPrompt(
  craftsman: CraftsmanProfile,
  requests: ProjectRequest[]
): string {
  const user = getUserById(craftsman.userId)
  return `技能者プロフィール：
- 名前：${user?.name ?? "不明"}
- 所在地：${craftsman.location}
- 対応エリア：${craftsman.serviceAreas.join("、")}
- 技能：${craftsman.skills.map((s) => s.name).join("、")}
- 設備：${craftsman.equipment.join("、")}
- 素材：${craftsman.materials.join("、")}
- 実績：受注${craftsman.completedOrders}件 / 評価${craftsman.rating}
- こんなこともできます：${craftsman.specialSkills.join("、")}

募集案件一覧：
${requests
  .map(
    (req) =>
      `- ID: ${req.id}\n  タイトル: ${req.title}\n  説明: ${req.description}\n  必要技能: ${(req.spec?.requiredSkills ?? []).join("、")}\n  素材: ${(req.spec?.materials ?? []).join("、")}`
  )
  .join("\n\n")}

以下のJSONスキーマで回答してください。
{
  "opportunities": [
    {
      "requestId": "案件ID",
      "title": "案件タイトル",
      "reason": "なぜこの技能者に適しているか、具体的な日本語の理由"
    }
  ]
}`
}

function normalizeOpportunities(list: unknown[], requests: ProjectRequest[]): Opportunity[] {
  const requestMap = new Map(requests.map((r) => [r.id, r]))
  const out: Opportunity[] = []
  for (const item of list) {
    if (!item || typeof item !== "object") continue
    const it = item as Record<string, unknown>
    const id = stringField(it.requestId)
    const req = id ? requestMap.get(id) : undefined
    if (!req) continue
    out.push({
      requestId: req.id,
      title: stringField(it.title) || req.title,
      reason: stringField(it.reason) || "対応できる可能性があります。",
    })
  }
  return out.slice(0, 5)
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function stringField(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim()
  return undefined
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => (typeof v === "string" ? v.trim() : String(v))).filter(Boolean)
}

function numberField(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const n = Number(value)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}
