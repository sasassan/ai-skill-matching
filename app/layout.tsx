import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { SessionProvider } from "@/components/session-provider"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { appName } from "@/lib/app-config"

export const metadata: Metadata = {
  title: {
    default: `${appName} - 得意なことが、誰かのうれしいに`,
    template: `%s | ${appName}`,
  },
  description:
    "趣味や経験、さまざまなスキルを持つ人と出会えるマーケットプレイス。",
}
export const dynamic = "force-dynamic"

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning className="antialiased">
      <body className="min-h-svh font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <SessionProvider>
            <div className="flex min-h-svh flex-col">
              <a href="#main-content" className="sr-only focus:not-sr-only">
                本文へ移動
              </a>
              <SiteHeader />
              <main
                id="main-content"
                tabIndex={-1}
                className="flex-1 outline-none"
              >
                {children}
              </main>
              <SiteFooter />
            </div>
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
