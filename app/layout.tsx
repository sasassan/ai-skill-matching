import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { SessionProvider } from "@/components/session-provider"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { cn } from "@/lib/utils"

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"],
})

const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"],
})

const baseUrl =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "SkillMatch - 作りたいとできるをAIでつなぐ",
    template: "%s | SkillMatch",
  },
  description:
    "車両内装カスタム・着脱式収納など、AI＋コンシェルジュが最適な技能者とマッチングします。依頼者と技能者をつなぐスキルマッチングプラットフォームです。",
  keywords: ["技能者", "副業", "マッチング", "AI", "カスタム", "内装", "ものづくり"],
  openGraph: {
    title: "SkillMatch - 作りたいとできるをAIでつなぐ",
    description:
      "車両内装カスタム・着脱式収納など、AI＋コンシェルジュが最適な技能者とマッチングします。",
    url: "/",
    siteName: "SkillMatch",
    locale: "ja_JP",
    type: "website",
    images: [`${baseUrl}/ogp.png`],
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillMatch - 作りたいとできるをAIでつなぐ",
    description:
      "車両内装カスタム・着脱式収納など、AI＋コンシェルジュが最適な技能者とマッチングします。",
    images: [`${baseUrl}/ogp.png`],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={cn("antialiased", notoSans.variable, notoSerif.variable)}
    >
      <body className="min-h-svh font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SessionProvider>
            <div className="flex min-h-svh flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
