import type { ChainWithContracts } from '@ensdomains/ensjs/chain'
import type { Client, Transport } from 'viem'
import { usePublicClient } from 'wagmi'

import type { EnsChainId } from '../lib/chains'

/** Every ENS contract the examples touch, so ENSjs actions type-check. */
export type EnsContractsChain = ChainWithContracts<
  | 'ensEthRegistrar'
  | 'ensUniversalResolver'
  | 'ensUniversalHelper'
  | 'multicall3'
  | 'ensVerifiableFactory'
  | 'ensPermissionedResolverImpl'
  | 'ensReverseRegistrar'
  | 'ensPublicResolver'
  | 'usdc'
  | 'dai'
>

/**
 * Public client for ENSjs actions. wagmi types the client as a union of every
 * configured chain, which ENSjs can't narrow, so it's typed by the ENS
 * contracts it needs instead.
 */
export function useEnsClient(chainId: EnsChainId) {
  return usePublicClient({ chainId }) as Client<Transport, EnsContractsChain>
}
