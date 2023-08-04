import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { ThemeProvider } from 'styled-components'
import { ThorinGlobalStyles, lightTheme } from '@ensdomains/thorin'
import { WagmiConfig } from 'wagmi'
import type { AppProps } from 'next/app'

import '@/styles/globals.css'
import { chains, wagmiConfig } from '@/providers'
import { DefaultSeo } from 'next-seo'
import { useIsMounted } from '@/hooks/useIsMounted'
import SEO from '../next-seo.config'

export default function App({ Component, pageProps }: AppProps) {
  const isMounted = useIsMounted()

  return (
    <WagmiConfig config={wagmiConfig}>
      <ThemeProvider theme={lightTheme}>
        <ThorinGlobalStyles />
        <RainbowKitProvider chains={chains}>
          <DefaultSeo {...SEO} />
          {isMounted && <Component {...pageProps} />}
        </RainbowKitProvider>
      </ThemeProvider>
    </WagmiConfig>
  )
}
