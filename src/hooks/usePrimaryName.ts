import { type Address, parseAbi } from 'viem'
import { mainnet as viemMainnet, sepolia as viemSepolia } from 'viem/chains'
import { useReadContract } from 'wagmi'

const universalResolverAbi = parseAbi([
  'function reverse(bytes lookupAddress, uint256 coinType) returns (string, address, address)',
])

const evmChainIdToCoinType = (chainId: number) => {
  if (chainId === 1) return 60

  return (0x80000000 | chainId) >>> 0
}

export const usePrimaryName = ({
  address,
  chainId,
  mainnet = false,
}: {
  address?: Address
  chainId?: number
  mainnet?: boolean
}) => {
  const chain = mainnet ? viemMainnet : viemSepolia
  const coinType = evmChainIdToCoinType(chainId ?? 1)

  const universalResolverAddress = mainnet
    ? '0xaBd80E8a13596fEeA40Fd26fD6a24c3fe76F05fB'
    : '0xb7B7DAdF4D42a08B3eC1d3A1079959Dfbc8CFfCC'

  return useReadContract({
    address: universalResolverAddress,
    abi: universalResolverAbi,
    functionName: 'reverse',
    chainId: chain.id,
    args: [address, coinType],
    query: {
      select: (data) => (data as string[])?.[0] ?? null,
      enabled: !!address,
    },
  })
}
