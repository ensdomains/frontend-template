import { addEnsContracts } from '@ensdomains/ensjs'
import type { Chain } from 'viem'
import {
  mainnet as _mainnet,
  sepolia as _sepolia,
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  linea,
  lineaSepolia,
  optimism,
  optimismSepolia,
} from 'viem/chains'

/**
 * ENS lives on Ethereum L1. `addEnsContracts` attaches every ENS contract
 * address (registry, registrar, Universal Resolver, ...) to the viem chain so
 * ENSjs actions know where to send calls.
 */
export const mainnet = addEnsContracts(_mainnet)
export const sepolia = addEnsContracts(_sepolia)

/** The two networks ENS is deployed on, and that the nav bar toggles between */
export const ensChains = [mainnet, sepolia] as const
export type EnsChain = (typeof ensChains)[number]
export type EnsChainId = EnsChain['id']

/**
 * L2s that have their own primary name (reverse) namespace on each network.
 * Used by the primary names example.
 */
export const l2Chains = {
  [mainnet.id]: [base, arbitrum, optimism, linea],
  [sepolia.id]: [baseSepolia, arbitrumSepolia, optimismSepolia, lineaSepolia],
} as const satisfies Record<EnsChainId, readonly Chain[]>

export const allChains = [
  ...ensChains,
  ...l2Chains[mainnet.id],
  ...l2Chains[sepolia.id],
] as const

export function isEnsChainId(
  chainId: number | undefined
): chainId is EnsChainId {
  return ensChains.some((chain) => chain.id === chainId)
}

export function getEnsChain(chainId: EnsChainId) {
  return chainId === sepolia.id ? sepolia : mainnet
}

/** Short label for the network toggle */
export function networkName(chainId: EnsChainId) {
  return chainId === sepolia.id ? 'Sepolia' : 'Mainnet'
}

/** A name's page on the ENS Explorer for this network */
export function ensExplorerUrl(chainId: EnsChainId, name: string) {
  const host =
    chainId === sepolia.id
      ? 'sepolia.explorer.ens.domains'
      : 'explorer.ens.domains'
  return `https://${host}/${encodeURIComponent(name)}`
}
