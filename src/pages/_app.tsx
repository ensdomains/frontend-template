import '@rainbow-me/rainbowkit/styles.css'

import { DefaultSeo } from 'next-seo'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { ThemeProvider } from 'styled-components'
import { ThorinGlobalStyles, lightTheme } from '@ensdomains/thorin'
import { WagmiProvider } from 'wagmi'
import type { AppProps } from 'next/app'

import '@/styles/globals.css'
import { wagmiConfig } from '@/providers'
import { useIsMounted } from '@/hooks/useIsMounted'
import SEO from '../next-seo.config'

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  const isMounted = useIsMounted()

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <ThorinGlobalStyles />
          <RainbowKitProvider>
            <DefaultSeo {...SEO} />
            {isMounted && <Component {...pageProps} />}
          </RainbowKitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
