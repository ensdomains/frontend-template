// L2 Primary Names usually have a few hour propagation delay
// This hook resolves the data instantly, provided the client has access to L1 and L2 clients
import { skipToken, useQuery } from '@tanstack/react-query'
import { type Hex } from 'viem'
import { getEnsName } from 'viem/actions'
import { useChains, usePublicClient } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

import { getEnsNameOptimistically } from './viem-plugin'

const l1ChainIds = [mainnet.id, sepolia.id]

type Props = {
  address: Hex | undefined
  l1ChainId?: (typeof l1ChainIds)[number]
  l2ChainId: number
}

export function useEnsNameOptimistic({
  address,
  l1ChainId = mainnet.id,
  l2ChainId,
}: Props) {
  const wagmiConfigChains = useChains()
  const wagmiConfigChainIds = [0, ...wagmiConfigChains.map((chain) => chain.id)]

  if (
    !wagmiConfigChainIds.includes(l1ChainId) ||
    !wagmiConfigChainIds.includes(l2ChainId)
  ) {
    throw new Error(
      `ChainId ${l1ChainId} or ${l2ChainId} is not in the wagmi config`
    )
  }

  if (!(l1ChainIds as number[]).includes(l1ChainId)) {
    throw new Error(`ChainId ${l1ChainId} is not an L1 chain`)
  }

  const l2Client = usePublicClient({ chainId: l2ChainId })
  const l1Client = usePublicClient({ chainId: l1ChainId })
  const enabled = !!(address && l1Client && l2Client)

  return useQuery({
    queryKey: ['l2-name', l1ChainId, l2ChainId, address],
    enabled,
    queryFn: enabled
      ? async () => {
          if (l2ChainId === l1ChainId) {
            return getEnsName(l1Client, { address })
          }

          return getEnsNameOptimistically(l1Client, {
            l2Client,
            address,
          })
        }
      : skipToken,
  })
}
