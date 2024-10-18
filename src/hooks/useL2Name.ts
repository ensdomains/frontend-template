// This is a temporary solution until we deploy the new ReverseRegistrar to mainnet
// https://github.com/ensdomains/ens-contracts/pull/379
import { useQuery } from '@tanstack/react-query'
import { Hex, parseAbi } from 'viem'
import {
  arbitrumSepolia,
  base,
  baseSepolia,
  holesky,
  lineaSepolia,
  mainnet,
  optimismSepolia,
  scroll,
  scrollSepolia,
  sepolia,
} from 'viem/chains'
import { useChainId, usePublicClient } from 'wagmi'

import { wagmiConfig } from '@/lib/web3'

const l2ReverseResolverDeployments = new Map<number, Hex>([
  [arbitrumSepolia.id, '0x74E20Bd2A1fE0cdbe45b9A1d89cb7e0a45b36376'],
  [base.id, '0x0D3b4af7f0f89C67163e5A301Ba1b37A16C968f1'],
  [baseSepolia.id, '0xa12159e5131b1eEf6B4857EEE3e1954744b5033A'],
  [lineaSepolia.id, '0x74E20Bd2A1fE0cdbe45b9A1d89cb7e0a45b36376'],
  [optimismSepolia.id, '0x74E20Bd2A1fE0cdbe45b9A1d89cb7e0a45b36376'],
  [scroll.id, '0x0d3b4af7f0f89c67163e5a301ba1b37a16c968f1'],
  [scrollSepolia.id, '0xc0497E381f536Be9ce14B0dD3817cBcAe57d2F62'],
])

// https://github.com/ensdomains/ens-contracts/blob/feature/simplify-reverse-resolver/deployments/base/L2ReverseResolver.json
const l2ReverseResolverAbi = parseAbi([
  'function node(address) view returns (bytes32)',
  'function name(bytes32) view returns (string)',
])

const l1ChainIds = [mainnet.id, sepolia.id, holesky.id] as const
type L1ChainId = (typeof l1ChainIds)[number]

// prettier-ignore
const l2ChainIds = [arbitrumSepolia.id, base.id, baseSepolia.id, lineaSepolia.id, optimismSepolia.id, scroll.id, scrollSepolia.id]
type L2ChainId = (typeof l2ChainIds)[number]

const wagmiConfigChainIds = wagmiConfig.chains.map((chain) => chain.id)
type WagmiConfigChainId = (typeof wagmiConfigChainIds)[number]

type Props = {
  address: Hex
  l1ChainId?: L1ChainId
  l2ChainId?: L2ChainId
}

function convertEVMChainIdToCoinType(chainId: number) {
  return (0x80000000 | chainId) >>> 0
}

export function useL2Name({ address, l1ChainId, l2ChainId }: Props) {
  const connectedChainId = useChainId() as WagmiConfigChainId
  const chainId = l2ChainId ?? connectedChainId

  if (!wagmiConfigChainIds.includes(chainId as any)) {
    throw new Error('Unsupported chain')
  }

  if (l1ChainIds.includes(l2ChainId as any)) {
    throw new Error("Use wagmi's native `useEnsName` hook for L1")
  }

  if (!wagmiConfigChainIds.includes(l1ChainId as any)) {
    throw new Error('Add mainnet or sepolia to your wagmi config')
  }

  const client = usePublicClient({
    config: wagmiConfig,
    chainId: chainId as WagmiConfigChainId,
  })

  const l1Client = usePublicClient({
    config: wagmiConfig,
    chainId: (l1ChainId ?? 1) as WagmiConfigChainId,
  })

  return useQuery({
    queryKey: ['l2-name', chainId, address],
    queryFn: async () => {
      const isSupportedChain = l2ReverseResolverDeployments.has(chainId)

      if (!isSupportedChain || !client) {
        throw new Error('Unsupported chain')
      }

      const l2ReverseResolver = l2ReverseResolverDeployments.get(chainId)!

      // TODO: do this in javascript
      const node = await client.readContract({
        address: l2ReverseResolver,
        abi: l2ReverseResolverAbi,
        functionName: 'node',
        args: [address],
      })

      const reverseName = await client.readContract({
        address: l2ReverseResolver,
        abi: l2ReverseResolverAbi,
        functionName: 'name',
        args: [node],
      })

      const forwardAddr = await l1Client.getEnsAddress({
        name: reverseName,
        coinType: convertEVMChainIdToCoinType(chainId),
      })

      if (forwardAddr?.toLowerCase() === address.toLowerCase()) {
        return reverseName
      }

      return null
    },
  })
}
