import { useCapabilities } from 'wagmi'

import type { EnsChainId } from '../lib/chains'
import { isAtomicBatchSupported } from '../lib/transactions'

/**
 * Whether the connected wallet can already send several calls as one atomic
 * EIP-5792 batch (`wallet_sendCalls`) on this chain. False while loading and
 * for wallets that don't support EIP-5792, which then get one transaction per
 * call instead.
 */
export function useAtomicBatching(chainId: EnsChainId) {
  const { data } = useCapabilities({
    chainId,
    query: { select: isAtomicBatchSupported },
  })
  return data === true
}
