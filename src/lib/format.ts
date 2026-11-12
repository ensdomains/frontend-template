import { type Address, formatUnits } from 'viem'

export function shortenAddress(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatAmount(amount: bigint, decimals: number) {
  return Number(formatUnits(amount, decimals)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
