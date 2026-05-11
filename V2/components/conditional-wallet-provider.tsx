"use client"
import { usePathname } from "next/navigation"
import { WalletProvider } from "@/components/wallet-provider"
import type { ReactNode } from "react"

const NO_WALLET_ROUTES = [
  "/career/verify",
  // add other public routes here if needed
]

export function ConditionalWalletProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const skip = NO_WALLET_ROUTES.some(route => pathname?.startsWith(route))

  if (skip) return <>{children}</>
  return <WalletProvider>{children}</WalletProvider>
}