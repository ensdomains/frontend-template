// L2 Primary Names usually have a few hour propagation delay
// This hook resolves the data instantly, provided the client has access to L1 and L2 clients
import { useQuery } from '@tanstack/react-query'
import {
  type Address,
  type Hex,
  type PublicClient,
  parseAbi,
  toCoinType,
} from 'viem'
import { useChains, usePublicClient } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

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

  const l2Client = usePublicClient({ chainId: l2ChainId })!
  const l1Client = usePublicClient({ chainId: l1ChainId })!

  return useQuery({
    queryKey: ['l2-name', l1ChainId, l2ChainId, address],
    queryFn: async () => {
      if (!address) {
        return null
      }

      if (l2ChainId === 0) {
        // Handle default namespace
        const defaultReverseResolver = await l1Client.getEnsResolver({
          name: 'reverse',
        })

        const defaultReverseRegistrar = await l1Client.readContract({
          address: defaultReverseResolver,
          abi: parseAbi(['function defaultRegistrar() view returns (address)']),
          functionName: 'defaultRegistrar',
        })

        return resolveReverseName({
          address,
          l1Client,
          l2Client: l1Client,
          l2ChainId,
          reverseRegistrar: defaultReverseRegistrar,
        })
      } else if (l2ChainId === 1) {
        return l1Client.getEnsName({ address })
      } else {
        // Handle L2 namespaces
        const reverseNamespace = `${toCoinType(l2ChainId).toString(16)}.reverse`
        const chainReverseResolver = await l1Client.getEnsResolver({
          name: reverseNamespace,
        })

        // Note: this will throw on unsupported chains, because `chainReverseResolver` will be the DefaultReverseResolver which doesn't have a `l2Registrar` function
        const l2ReverseRegistrar = await l1Client.readContract({
          address: chainReverseResolver,
          abi: parseAbi(['function l2Registrar() view returns (address)']),
          functionName: 'l2Registrar',
        })

        return resolveReverseName({
          address,
          l1Client,
          l2Client,
          l2ChainId,
          reverseRegistrar: l2ReverseRegistrar,
        })
      }
    },
  })
}

async function resolveReverseName({
  address,
  l1Client,
  l2Client,
  l2ChainId,
  reverseRegistrar,
}: {
  l1Client: PublicClient
  l2Client: PublicClient
  address: Hex
  l2ChainId: number
  reverseRegistrar: Address
}) {
  const reverseName = await l2Client.readContract({
    address: reverseRegistrar,
    abi: parseAbi(['function nameForAddr(address) view returns (string)']),
    functionName: 'nameForAddr',
    args: [address],
  })

  const forwardAddr = await l1Client.getEnsAddress({
    name: reverseName,
    coinType: toCoinType(l2ChainId),
  })

  if (forwardAddr?.toLowerCase() === address.toLowerCase()) {
    return reverseName
  }

  return null
}
