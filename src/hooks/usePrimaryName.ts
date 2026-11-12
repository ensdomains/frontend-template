import type { Address } from 'viem'
import { useEnsName } from 'wagmi'

import { useNetwork } from '../lib/network'

/**
 * The primary name (reverse record) of an address on the selected network.
 *
 * `useEnsName` calls the Universal Resolver's `reverse()`, which also checks
 * that the name resolves back to the address (forward verification), so the
 * result is safe to display in place of the address.
 */
export function usePrimaryName(address: Address | undefined) {
  const { chainId } = useNetwork()
  return useEnsName({ address, chainId, query: { enabled: !!address } })
}
