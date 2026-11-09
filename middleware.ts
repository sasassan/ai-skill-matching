import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key || key === "your-anon-key") return NextResponse.next({ request })
  let parsedUrl: URL
  try { parsedUrl = new URL(url) } catch { return NextResponse.next({ request }) }
  const validProtocol = parsedUrl.protocol === "https:" || (parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedUrl.hostname))
  if (!validProtocol || parsedUrl.hostname === "your-project.supabase.co") return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
      },
    },
  })
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ["/admin/:path*", "/mypage/:path*", "/listings/:path*", "/providers/:path*", "/bookings/:path*", "/orders/:path*", "/messages/:path*", "/search/:path*"],
}
