"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { currentUser, users, type User, type UserRole } from "@/lib/demo-data"

interface SessionContextValue {
  user: User
  role: UserRole
  switchRole: (role: UserRole) => void
  logout: () => void
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(currentUser.role)

  const user = React.useMemo(() => {
    return users.find((u) => u.role === role) ?? currentUser
  }, [role])

  const switchRole = useCallback((next: UserRole) => {
    setRole(next)
  }, [])

  const logout = useCallback(() => {
    setRole("requester")
  }, [])

  return (
    <SessionContext.Provider value={{ user, role, switchRole, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
