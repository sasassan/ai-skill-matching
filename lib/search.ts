import { getUserById, type CraftsmanProfile } from "@/lib/demo-data"

export interface SearchFilters {
  query: string
  freeText: string
  prefecture: string
  category: string
  material: string
  minRating: number
  maxHourlyRate: number | null
}

export const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  freeText: "",
  prefecture: "all",
  category: "all",
  material: "all",
  minRating: 0,
  maxHourlyRate: null,
}

export interface SearchOptions {
  prefectures: string[]
  categories: string[]
  materials: string[]
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "")
}

function searchableText(profile: CraftsmanProfile): string {
  const user = getUserById(profile.userId)
  return normalize(
    [
      user?.name ?? "",
      profile.bio,
      profile.location,
      profile.prefecture,
      ...profile.serviceAreas,
      ...profile.skills.flatMap((s) => [s.name, s.category]),
      ...profile.equipment,
      ...profile.materials,
      ...profile.specialSkills,
    ].join(" "),
  )
}

function bigrams(text: string): Set<string> {
  const t = normalize(text).replace(/[、。・,，.!！?？:：;；/／\\「」()（）[\]【】]/g, "")
  const set = new Set<string>()
  for (let i = 0; i < t.length - 1; i += 1) {
    set.add(t.slice(i, i + 2))
  }
  return set
}

function matchText(profile: CraftsmanProfile, raw: string): boolean {
  const text = normalize(raw)
  if (!text) return true

  const haystack = searchableText(profile)
  if (haystack.includes(text)) return true

  // Short keywords (2 chars or less) require an exact substring hit.
  if (text.length <= 2) return false

  // Japanese text has no spaces, so use character bigram overlap for fuzzy matching.
  const textGrams = bigrams(text)
  const haystackGrams = bigrams(haystack)
  let overlap = 0
  for (const gram of textGrams) {
    if (haystackGrams.has(gram)) overlap += 1
  }
  return overlap >= 2
}

export function searchCraftsmen(
  profiles: CraftsmanProfile[],
  filters: SearchFilters,
): CraftsmanProfile[] {
  const query = normalize(filters.query)
  const freeText = normalize(filters.freeText)

  return profiles.filter((profile) => {
    if (query && !matchText(profile, query)) return false
    if (freeText && !matchText(profile, freeText)) return false

    if (filters.prefecture !== "all" && profile.prefecture !== filters.prefecture) {
      return false
    }
    if (
      filters.category !== "all" &&
      !profile.skills.some((skill) => skill.category === filters.category)
    ) {
      return false
    }
    if (filters.material !== "all" && !profile.materials.includes(filters.material)) {
      return false
    }
    if (profile.rating < filters.minRating) return false
    if (
      filters.maxHourlyRate !== null &&
      (profile.hourlyRate ?? Number.POSITIVE_INFINITY) > filters.maxHourlyRate
    ) {
      return false
    }
    return true
  })
}

export function getSearchOptions(profiles: CraftsmanProfile[]): SearchOptions {
  const prefectures = Array.from(new Set(profiles.map((p) => p.prefecture))).sort()
  const categories = Array.from(
    new Set(profiles.flatMap((p) => p.skills.map((s) => s.category))),
  ).sort()
  const materials = Array.from(new Set(profiles.flatMap((p) => p.materials))).sort()
  return { prefectures, categories, materials }
}
