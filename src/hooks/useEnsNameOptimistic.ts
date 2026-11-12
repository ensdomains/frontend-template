// L2 primary names usually take a few hours to propagate to L1, because the
// L1 resolver for each L2 reverse namespace reads L2 state through a proof.
// This hook skips the wait by reading the L2 reverse registrar directly, then
// verifying the forward record on L1. Use `usePrimaryName` (the Universal
// Resolver) for anything security sensitive; this is for instant feedback.
import { getUnderlyingAddress } from '@ensdomains/ensjs/public/v2'
import { useQuery } from '@tanstack/react-query'
import {
  type Address,
  type PublicClient,
  isAddressEqual,
  parseAbi,
  toCoinType,
} from 'viem'
import { usePublicClient } from 'wagmi'

import type { EnsChainId, allChains } from '../lib/chains'
import { normalizedOrNull } from '../lib/format'

type Props = {
  address: Address | undefined
  /** The L1 that ENS is on (mainnet or Sepolia) */
  l1ChainId: EnsChainId
  /** The chain to get the primary name for. Use the L1 ID for L1 names. */
  l2ChainId: (typeof allChains)[number]['id']
}

export function useEnsNameOptimistic({ address, l1ChainId, l2ChainId }: Props) {
  const l1Client = usePublicClient({ chainId: l1ChainId }) as PublicClient
  const l2Client = usePublicClient({ chainId: l2ChainId }) as PublicClient

  return useQuery({
    queryKey: ['primary-name-optimistic', l1ChainId, l2ChainId, address],
    enabled: !!address,
    queryFn: async () => {
      if (!address) return null

      // L1 primary names have no propagation delay
      if (l2ChainId === l1ChainId) {
        return normalizedOrNull(await l1Client.getEnsName({ address }))
      }

      // Each L2 has its own reverse namespace, e.g. 80002105.reverse for Base
      const reverseNamespace = `${toCoinType(l2ChainId).toString(16)}.reverse`
      const chainReverseResolver = await getUnderlyingResolver(
        l1Client,
        reverseNamespace
      )

      // Throws on chains without an L2 reverse registrar, because the
      // namespace falls back to the default reverse resolver
      const l2ReverseRegistrar = await l1Client.readContract({
        address: chainReverseResolver,
        abi: parseAbi(['function l2Registrar() view returns (address)']),
        functionName: 'l2Registrar',
      })

      const reverseName = await l2Client.readContract({
        address: l2ReverseRegistrar,
        abi: parseAbi(['function nameForAddr(address) view returns (string)']),
        functionName: 'nameForAddr',
        args: [address],
      })
      if (!normalizedOrNull(reverseName)) return null

      // A reverse record is only valid if the name resolves back to the
      // address on that chain's coin type
      const forwardAddr = await l1Client.getEnsAddress({
        name: reverseName,
        coinType: toCoinType(l2ChainId),
      })

      return forwardAddr && isAddressEqual(forwardAddr, address)
        ? reverseName
        : null
    },
  })
}

/**
 * In ENSv2, names that still live in the v1 registry (like the reverse
 * namespaces) are served through a composite "fallback" resolver, which is
 * what the Universal Resolver reports. Ask it for the actual v1 resolver,
 * since that's the contract with the `l2Registrar()` getter.
 */
async function getUnderlyingResolver(client: PublicClient, name: string) {
  const resolver = await client.getEnsResolver({ name })
  try {
    const [underlying] = await getUnderlyingAddress(client, {
      resolverAddress: resolver,
      name,
    })
    return underlying
  } catch {
    // Not a composite resolver, so it's already the actual one
    return resolver
  }
}
