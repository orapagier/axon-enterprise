import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Inter, Playfair_Display, DM_Serif_Display } from "next/font/google"
import "styles/globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    template: "%s | Mindanao Fresh Hub",
    default: "Mindanao Fresh Hub",
  },
  applicationName: "Fresh Hub",
  // Installable PWA: links the manifest + icons. iOS only allows web push once
  // the site is added to the Home Screen, so appleWebApp must mark it capable.
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Fresh Hub",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#15803d",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  // suppressHydrationWarning: Headless UI stamps data-headlessui-focus-visible
  // on <html> (and browser extensions inject attributes) before hydration
  // finishes, which React would otherwise report as a mismatch. The flag is
  // scoped to this element's attributes only.
  return (
    <html
      lang="en"
      data-mode="light"
      className={`${inter.variable} ${playfair.variable} ${dmSerif.variable}`}
      suppressHydrationWarning
    >
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
