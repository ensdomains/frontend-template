import { type Address, getAddress, isAddress } from 'viem'
import { normalize } from 'viem/ens'
import { useEnsAddress, useEnsName } from 'wagmi'

import { useNetwork } from '../lib/network'
import { useDebounce } from './useDebounce'

export type ResolvedInput = {
  address: Address
  /** The ENS name that was entered, or the address's primary name */
  name?: string
}

/**
 * Turns user input into an address. Accepts a plain address or any ENS name
 * (including DNS names like `example.com` and offchain subnames), which is how
 * every address field should behave.
 */
export function useAddressOrName(input: string) {
  const { chainId } = useNetwork()
  const debounced = useDebounce(input.trim())

  // Mixed-case addresses must have a valid EIP-55 checksum
  const looksLikeAddress = isAddress(debounced, { strict: false })
  const isValidAddress = looksLikeAddress && isAddress(debounced)

  // Names must be normalized (ENSIP-15) before they're resolved
  let name: string | undefined
  let invalidName = false
  if (!looksLikeAddress && debounced.includes('.')) {
    try {
      name = normalize(debounced)
    } catch {
      invalidName = true
    }
  }

  const forward = useEnsAddress({
    name,
    chainId,
    query: { enabled: !!name },
  })

  const address = isValidAddress
    ? getAddress(debounced)
    : forward.data
      ? getAddress(forward.data)
      : undefined

  // For a pasted address, show its primary name too
  const reverse = useEnsName({
    address,
    chainId,
    query: { enabled: !!address && isValidAddress },
  })

  const isLoading = input.trim() !== debounced || forward.isLoading
  const error =
    !debounced || isLoading
      ? undefined
      : looksLikeAddress && !isValidAddress
        ? 'Invalid address checksum'
        : invalidName
          ? 'Invalid ENS name'
          : !isValidAddress && !name
            ? 'Enter an address or ENS name'
            : name && forward.isFetched && !address
              ? 'Name does not resolve to an address'
              : undefined

  const result: ResolvedInput | undefined = address
    ? { address, name: name ?? reverse.data ?? undefined }
    : undefined

  return { result, isLoading, error }
}
