import { http } from 'viem'
import { createConfig } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'

import { allChains } from './chains'

/**
 * Free PublicNode RPCs by default. Set `VITE_<CHAIN>_RPC_URL` in `.env.local`
 * to use your own for mainnet or Sepolia. Anything prefixed with `VITE_` ends
 * up in the client bundle, so only use RPC URLs that are safe to expose.
 */
const RPC_URLS: Record<(typeof allChains)[number]['id'], string> = {
  1:
    import.meta.env.VITE_MAINNET_RPC_URL ||
    'https://ethereum-rpc.publicnode.com',
  11155111:
    import.meta.env.VITE_SEPOLIA_RPC_URL ||
    'https://ethereum-sepolia-rpc.publicnode.com',
  8453: 'https://base-rpc.publicnode.com',
  84532: 'https://base-sepolia-rpc.publicnode.com',
  42161: 'https://arbitrum-one-rpc.publicnode.com',
  421614: 'https://arbitrum-sepolia-rpc.publicnode.com',
  10: 'https://optimism-rpc.publicnode.com',
  11155420: 'https://optimism-sepolia-rpc.publicnode.com',
  59144: 'https://linea-rpc.publicnode.com',
  59141: 'https://linea-sepolia-rpc.publicnode.com',
}

/**
 * WalletConnect needs a project ID from https://dashboard.reown.com. Without
 * one, only browser wallets (EIP-6963 / injected) are offered.
 */
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

export const config = createConfig({
  chains: allChains,
  connectors: [
    injected(),
    ...(WALLETCONNECT_PROJECT_ID
      ? [
          walletConnect({
            projectId: WALLETCONNECT_PROJECT_ID,
            // We render our own QR code in WalletModal instead of Reown's modal
            showQrModal: false,
            metadata: {
              name: 'ENS Frontend Examples',
              description: 'Reference implementations of ENS features',
              url: window.location.origin,
              icons: [`${window.location.origin}/favicon.svg`],
            },
          }),
        ]
      : []),
  ],
  transports: Object.fromEntries(
    allChains.map((chain) => [
      chain.id,
      http(RPC_URLS[chain.id], { batch: true }),
    ])
  ) as Record<(typeof allChains)[number]['id'], ReturnType<typeof http>>,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
