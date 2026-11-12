import { type Address, formatUnits } from 'viem'
import { normalize } from 'viem/ens'

export function shortenAddress(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatAmount(amount: bigint, decimals: number) {
  return Number(formatUnits(amount, decimals)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Primary names are strings set by the address owner. Forward verification
 * proves the name points back to the address, but not that it's normalized
 * (ENSIP-15), so an unnormalized name could hide invisible or look-alike
 * characters. Only display names that are already normalized.
 */
export function normalizedOrNull(name: string | null | undefined) {
  if (!name) return null
  try {
    return normalize(name) === name ? name : null
  } catch {
    return null
  }
}
