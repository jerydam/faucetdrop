import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThirdwebProvider } from "@/components/thirdweb-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NetworkProvider } from "@/hooks/use-network"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FaucetDrops",
  description: "Token Drops Made Easy 💧",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          
            <ThirdwebProvider>
              <NetworkProvider>
                <div className="min-h-screen flex flex-col">
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                </div>
                <Toaster />
                </NetworkProvider>
            </ThirdwebProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}