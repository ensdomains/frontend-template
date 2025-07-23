'use client'

import { ThemeProvider } from '@ensdomains/thorin'
import '@ensdomains/thorin/dist/thorin.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'

import { wagmiConfig } from '@/lib/web3'

const queryClient = new QueryClient()

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultMode="light">{children}</ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
