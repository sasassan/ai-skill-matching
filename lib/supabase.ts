import { createClient } from "@supabase/supabase-js"

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://supabase-api-prod.verdent.ai/p/p14a363fb70a20b2add7a"

export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMTA2NzM2MjkxLCJpYXQiOjE3OTExMTcwOTEsImlzcyI6InN1cGFiYXNlIiwicHJvamVjdF9yZWYiOiJwMTRhMzYzZmI3MGEyMGIyYWRkN2EiLCJyb2xlIjoiYW5vbiJ9.G5_KvQihnsnV4zr9nNOez0l03WMRTW_gdw8SkggS81k"

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
