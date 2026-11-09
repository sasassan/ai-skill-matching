import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { ProfileRecord, UserRole } from "@/lib/supabase"

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key || key === "your-anon-key") {
    throw new Error("Supabase is not configured. Set valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY values.")
  }
  let parsedUrl: URL
  try { parsedUrl = new URL(url) } catch { throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.") }
  if ((parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedUrl.hostname))) || parsedUrl.hostname === "your-project.supabase.co") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS, except for local Supabase development.")
  }

  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {}
      },
    },
  })
}

export interface AuthenticatedProfile extends Omit<ProfileRecord, "role"> {
  role: UserRole | "requester" | "craftsman"
  email: string
}

export async function getServerProfile(): Promise<AuthenticatedProfile | null> {
  const client = await createServerSupabaseClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle()
  if (profileError || !profile) return null
  return { ...(profile as ProfileRecord), email: data.user.email ?? "" }
}

export async function requireServerProfile(roles?: UserRole[]) {
  const profile = await getServerProfile()
  if (!profile) throw new Error("Authentication required")
  if (roles && (profile.role !== "user" && profile.role !== "admin" || !roles.includes(profile.role))) throw new Error("Insufficient permissions")
  return profile
}
