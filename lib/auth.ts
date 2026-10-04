"use client"

import { createVerdentAuth } from "@verdent/auth-js"
import { supabase } from "@/lib/supabase"

const oauthInitiateUrl =
  process.env.NEXT_PUBLIC_VERDENT_OAUTH_INITIATE_URL ??
  "https://cloud-oauth.verdent.ai/app/initiate"

export const auth = createVerdentAuth({
  supabase,
  oauth: {
    authorizeUrl: oauthInitiateUrl,
  },
})
