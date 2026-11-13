import { getAvailable } from '@ensdomains/ensjs/public'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { useNetwork } from '../lib/network'
import { type PaymentToken, getPrice, parseLabel } from '../lib/registration'
import { useDebounce } from './useDebounce'
import { useEnsClient } from './useEnsClient'

/** Parses a .eth name as it's typed, and checks availability and price */
export function useNameAvailability({
  input,
  years,
  token,
}: {
  input: string
  years: number
  token: PaymentToken
}) {
  const { chainId } = useNetwork()
  const client = useEnsClient(chainId)
  const debounced = useDebounce(input)
  const parsed = parseLabel(debounced)
  const label = parsed?.label

  const availability = useQuery({
    queryKey: ['available', chainId, label],
    queryFn: () => getAvailable(client, { name: `${label}.eth` }),
    enabled: !!label,
  })

  const price = useQuery({
    queryKey: ['price', chainId, label, years, token],
    // Tagged with what it's the price of, since the previous price stays on
    // screen while a new one loads (see `placeholderData`)
    queryFn: async () => ({
      ...(await getPrice(client, { label: label!, years, token })),
      chainId,
      label: label!,
      token,
    }),
    enabled: !!label && availability.data === true && years > 0,
    // Keep showing the last price while switching tokens or years, instead of
    // removing the price row for a moment
    placeholderData: keepPreviousData,
  })
  // Only for the name on screen: never a placeholder from another name or network
  const priceData =
    price.data?.label === label && price.data?.chainId === chainId
      ? price.data
      : undefined

  return {
    label,
    error: parsed?.error,
    isTyping: input !== debounced,
    isAvailable: availability.data,
    isLoading: availability.isLoading,
    /** Can be the previous token's or duration's price; see `isPriceStale` */
    price: priceData,
    /** True while `price` is a placeholder for a new token or duration */
    isPriceStale: price.isPlaceholderData,
  }
}
