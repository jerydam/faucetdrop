import { useContext } from "react"
import { WalletContext } from "@/components/wallet-provider"

export interface UseWalletReturn {
  provider: any
  signer: any
  address: string | null
  chainId: number | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  ensureCorrectNetwork: (requiredChainId: number) => Promise<boolean>
  connectedWalletName: string | null
}

export function useWallet(): UseWalletReturn {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}