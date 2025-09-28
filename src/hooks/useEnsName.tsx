// This is the correct way to implement ENS Primary Name resolution with L2 support.
// Caveats: propogation is slow, which can lead to a confusing UX and suboptimal DX during hackathons.
// See the other files in this directory for alternative approaches.
import { type Address, parseAbi, toCoinType } from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { useReadContract } from 'wagmi'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const l1ChainIds = [mainnet.id, sepolia.id] as const

export const useEnsName = ({
  address,
  l1ChainId = mainnet.id,
  l2ChainId,
}: {
  address: Address | undefined
  l1ChainId?: (typeof l1ChainIds)[number]
  l2ChainId?: number
}) => {
  const coinType = toCoinType(l2ChainId ?? l1ChainId)

  return useReadContract({
    address: '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe', // Universal Resolver
    abi: parseAbi([
      'function reverse(bytes lookupAddress, uint256 coinType) returns (string, address, address)',
      'error ResolverNotFound(bytes name)',
      'error ResolverNotContract(bytes name, address resolver)',
      'error UnsupportedResolverProfile(bytes4 selector)',
      'error ResolverError(bytes errorData)',
      'error ReverseAddressMismatch(string primary, bytes primaryAddress)',
      'error HttpError(uint16 status, string message)',
    ]),
    functionName: 'reverse',
    chainId: l1ChainId,
    args: [address, coinType],
    query: {
      select: (data) => (data as string[])?.[0] ?? null,
      enabled: !!address,
    },
  })
}
