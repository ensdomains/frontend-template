// Placeholder until this is supported natively in wagmi: https://github.com/wagmi-dev/wagmi/pull/2733
import type {
  QueryFunctionContext,
  UseQueryOptions,
} from '@tanstack/react-query'
import { getPublicClient } from '@wagmi/core'
import { useChainId, useQuery } from 'wagmi'

type QueryFunctionArgs<T extends (...args: any) => any> = QueryFunctionContext<
  ReturnType<T>
>

type QueryConfig<TData, TError, TSelectData = TData> = Pick<
  UseQueryOptions<TData, TError, TSelectData>,
  | 'cacheTime'
  | 'enabled'
  | 'isDataEqual'
  | 'staleTime'
  | 'structuralSharing'
  | 'suspense'
  | 'onError'
  | 'onSettled'
  | 'onSuccess'
> & {
  /** Scope the cache to a given context. */
  scopeKey?: string
}

type UseEnsTextArgs = Partial<FetchEnsTextArgs>
type UseEnsTextConfig = QueryConfig<FetchEnsTextResult, Error>

type QueryKeyArgs = UseEnsTextArgs
type QueryKeyConfig = Pick<UseEnsTextConfig, 'scopeKey'>

type FetchEnsTextArgs = {
  /** Name to lookup */
  name: string
  /** Key to lookup */
  key: string
  /** Chain id to use for Public Client */
  chainId?: number
}

type FetchEnsTextResult = string | null

async function fetchEnsText({
  name,
  key,
  chainId,
}: FetchEnsTextArgs): Promise<FetchEnsTextResult> {
  const publicClient = getPublicClient({ chainId })
  return publicClient.getEnsText({
    name,
    key,
  })
}

function queryKey({
  name,
  key,
  chainId,
  scopeKey,
}: QueryKeyArgs & QueryKeyConfig) {
  return [{ entity: 'ensText', name, key, chainId, scopeKey }] as const
}

function queryFn({
  queryKey: [{ name, key, chainId }],
}: QueryFunctionArgs<typeof queryKey>) {
  if (!name) throw new Error('name is required')
  if (!key) throw new Error('key is required')
  return fetchEnsText({ name, key, chainId })
}

export function useEnsText({
  name,
  key,
  cacheTime,
  chainId: chainId_,
  enabled = true,
  scopeKey,
  staleTime = 1_000 * 60 * 60 * 24, // 24 hours
  suspense,
  onError,
  onSettled,
  onSuccess,
}: UseEnsTextArgs & UseEnsTextConfig = {}) {
  const chainId = useChainId({ chainId: chainId_ })

  return useQuery(queryKey({ name, key, chainId, scopeKey }), queryFn, {
    cacheTime,
    enabled: Boolean(enabled && name && key && chainId),
    staleTime,
    suspense,
    onError,
    onSettled,
    onSuccess,
  })
}
