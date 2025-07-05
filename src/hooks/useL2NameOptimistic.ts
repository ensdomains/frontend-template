// L2 Primary Names usually have a few hour propagation delay
// This hook resolves the data instantly, provided the client has access to L1 and L2 clients
import { useQuery } from '@tanstack/react-query'
import { type Hex, parseAbi, zeroAddress } from 'viem'
import { useChainId, usePublicClient } from 'wagmi'
import { holesky, mainnet, sepolia } from 'wagmi/chains'

import { wagmiConfig } from '@/lib/web3'

const l1ChainIds = [mainnet.id, sepolia.id, holesky.id]
const wagmiConfigChainIds = wagmiConfig.chains.map((chain) => chain.id)
type WagmiConfigChainId = (typeof wagmiConfigChainIds)[number]

type Props = {
  address: Hex
  l1ChainId?: number
  l2ChainId?: number
}

export function useL2NameOptimistic({
  address,
  l1ChainId = 1,
  l2ChainId,
}: Props) {
  const connectedChainId = useChainId() as WagmiConfigChainId
  const chainId = l2ChainId ?? connectedChainId

  if (!wagmiConfigChainIds.includes(chainId as any)) {
    throw new Error('`l2ChainId` is not in the wagmi config')
  }

  if (l1ChainIds.includes(l2ChainId as any)) {
    throw new Error("Use wagmi's native `useEnsName` hook for L1")
  }

  if (!wagmiConfigChainIds.includes(l1ChainId as any)) {
    throw new Error(
      '`l1ChainId` is not in the wagmi config. Must have `mainnet`, `sepolia` or `holesky`'
    )
  }

  const l2Client = usePublicClient({
    config: wagmiConfig,
    chainId: chainId as WagmiConfigChainId,
  })

  const l1Client = usePublicClient({
    config: wagmiConfig,
    chainId: l1ChainId as WagmiConfigChainId,
  })

  return useQuery({
    queryKey: ['l2-name', l1ChainId, chainId, address],
    queryFn: async () => {
      if (!l2Client) {
        throw new Error('`l2Client` is undefined')
      }

      const reverseNamespace = `${evmChainIdToCoinType(chainId).toString(16)}.reverse`
      const chainReverseResolver = await l1Client.getEnsResolver({
        name: reverseNamespace,
      })

      if (chainReverseResolver === zeroAddress) {
        throw new Error(`No reverse resolver found for chain ${chainId}`)
      }

      const l2ReverseRegistrar = await l1Client.readContract({
        address: chainReverseResolver,
        abi: parseAbi(['function l2Registrar() view returns (address)']),
        functionName: 'l2Registrar',
      })

      if (!l2ReverseRegistrar) {
        throw new Error(`No reverse registrar found on chain ${chainId}`)
      }

      const reverseName = await l2Client.readContract({
        address: l2ReverseRegistrar,
        abi: parseAbi(['function nameForAddr(address) view returns (string)']),
        functionName: 'nameForAddr',
        args: [address],
      })

      const forwardAddr = await l1Client.getEnsAddress({
        name: reverseName,
        coinType: evmChainIdToCoinType(chainId),
      })

      if (forwardAddr?.toLowerCase() === address.toLowerCase()) {
        return reverseName
      }

      return null
    },
  })
}

const evmChainIdToCoinType = (chainId: number) => {
  return (0x80000000 | chainId) >>> 0
}
