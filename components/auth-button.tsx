"use client"

import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"

interface AuthButtonProps {
  children?: React.ReactNode
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}

export function AuthButton({
  children = "ログイン / 新規登録",
  className,
  variant = "default",
  size,
}: AuthButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => auth.openSignInModal()}
    >
      {children}
    </Button>
  )
}
