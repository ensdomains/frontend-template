import { getAvailable } from '@ensdomains/ensjs/public'
import { useQuery } from '@tanstack/react-query'

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
    queryFn: () => getPrice(client, { label: label!, years, token }),
    enabled: !!label && availability.data === true && years > 0,
  })

  return {
    label,
    error: parsed?.error,
    isTyping: input !== debounced,
    isAvailable: availability.data,
    isLoading: availability.isLoading,
    price: price.data,
    isPriceLoading: price.isLoading,
  }
}
