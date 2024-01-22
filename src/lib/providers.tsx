'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { ThemeProvider } from 'styled-components'
import { ThorinGlobalStyles, lightTheme } from '@ensdomains/thorin'
import { useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'

import { wagmiConfig } from '@/lib/web3'
import StyledComponentsRegistry from '@/lib/sc-registry'

const queryClient = new QueryClient()

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <StyledComponentsRegistry>
          <ThemeProvider theme={lightTheme}>
            <ThorinGlobalStyles />
            <RainbowKitProvider>{isMounted && children}</RainbowKitProvider>
          </ThemeProvider>
        </StyledComponentsRegistry>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
