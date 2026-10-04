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
  // OpenAI API への置き換えポイント
  await new Promise((resolve) => setTimeout(resolve, 800))
  return {
    title: "AIが生成したタイトル",
    category: "車両内装カスタム（収納）",
    summary: `${input.slice(0, 40)}...に基づく要約`,
    requiredSkills: ["木工", "CAD設計", "樹脂成型"],
    materials: ["合板", "滑り止めフェルト", "取っ手金具"],
    budget: "15万円〜25万円",
    deadline: "2026年12月中旬",
    notes: "防水加工・軽量設計が望ましい。",
  }
}

export async function generateSpecification(input: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  return `【依頼内容】\n${input}\n\n【AI補足仕様】\n- サイズ: 車種に応じたフルオーダー\n- 素材: 耐水・軽量素材を推奨\n- 納期: 依頼後4週間を目安`
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
  await new Promise((resolve) => setTimeout(resolve, 600))
  return craftsmanIds.map((id, index) => ({
    craftsmanId: id,
    score: 95 - index * 10,
    reason: "必要技能・実績・地域からAIが推定したマッチング理由",
  }))
}
