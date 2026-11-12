import { getRecords } from '@ensdomains/ensjs/public'
import { useQuery } from '@tanstack/react-query'
import { normalize } from 'viem/ens'

import { useNetwork } from '../lib/network'
import { useEnsClient } from './useEnsClient'

/** Common text record keys (ENSIP-5 and ENSIP-18) */
export const PROFILE_TEXT_KEYS = [
  'description',
  'url',
  'email',
  'location',
  'com.twitter',
  'com.github',
  'com.discord',
  'org.telegram',
] as const

/** Coin types to show: ETH, then chain-specific addresses (ENSIP-11) */
export const PROFILE_COINS = [
  'eth',
  'btc',
  'sol',
  'base',
  'arb1',
  'op',
] as const

/**
 * Fetches a name's records in a single Universal Resolver call (one RPC
 * request, plus CCIP-Read requests for offchain names).
 */
export function useProfile(name: string | undefined) {
  const { chainId } = useNetwork()
  const client = useEnsClient(chainId)

  return useQuery({
    queryKey: ['profile', chainId, name],
    enabled: !!name,
    queryFn: async () => {
      const records = await getRecords(client, {
        name: name!,
        texts: PROFILE_TEXT_KEYS,
        coins: PROFILE_COINS,
        contentHash: true,
        abi: false,
        // Don't fail the whole profile on one unknown coin
        ignoreInvalidCoinTypes: true,
      })

      return {
        resolverAddress: records.resolverAddress,
        // Drop empty records
        texts: records.texts.filter((t) => t.value),
        coins: records.coins.filter((c) => c.value),
        contentHash: records.contentHash,
      }
    },
  })
}

/** Normalizes a name for lookup, or returns an error message */
export function parseName(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return {}
  if (!trimmed.includes('.'))
    return { error: 'Enter a full name, like ens.eth' }
  try {
    return { name: normalize(trimmed) }
  } catch {
    return { error: 'Invalid ENS name' }
  }
}
