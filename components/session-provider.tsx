"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import {
  createBrowserSupabaseClient,
  getProfile,
  signOutFromSupabase,
  type ProfileRecord,
  type UserRole,
} from "@/lib/supabase"

export interface SessionUser extends Omit<ProfileRecord, "role"> {
  role: UserRole | "requester" | "craftsman"
  email: string
}

interface SessionContextValue {
  user: SessionUser | null
  role: SessionUser["role"] | null
  isLoading: boolean
  error: string | null
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let client: ReturnType<typeof createBrowserSupabaseClient>
    const loadUser = async (authUser: { id: string; email?: string } | null) => {
      if (!authUser) {
        if (active) { setUser(null); setError(null) }
        return
      }
      try {
        const profile = await getProfile(client, authUser.id)
        if (active) {
          setUser(profile ? { ...profile, email: authUser.email ?? "" } : null)
          setError(profile ? null : "プロフィールが見つかりません。")
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "認証状態を確認できませんでした。")
      }
    }

    try {
      client = createBrowserSupabaseClient()
      void client.auth.getSession().then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError
        return loadUser(data.session?.user ?? null)
      }).catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "認証状態を確認できませんでした。")
      }).finally(() => {
        if (active) setIsLoading(false)
      })
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => { void loadUser(session?.user ?? null) }, 0)
      })
      return () => {
        active = false
        data.subscription.unsubscribe()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Supabase環境変数を確認してください。")
      setIsLoading(false)
      return () => {
        active = false
      }
    }
  }, [])

  const logout = useCallback(async () => {
    await signOutFromSupabase()
    setUser(null)
  }, [])

  return (
    <SessionContext.Provider
      value={{ user, role: user?.role ?? null, isLoading, error, logout }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useSession must be used within SessionProvider")
  return context
}
