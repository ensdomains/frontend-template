import type {
  Account,
  Address,
  Chain,
  Client,
  GetEnsNameReturnType,
  Transport,
} from 'viem'
import { readContract } from 'viem/actions'
import { getEnsAddress, getEnsResolver, toCoinType } from 'viem/ens'
import { parseAbi } from 'viem/utils'

// Omit coinType because we just take it from l2Client.chain.id
type GetEnsNameOptimisticallyArgs = {
  address: Address
  l2Client: Client<Transport, Chain, Account | undefined>
}

type EnsOptimisticActions = {
  getEnsNameOptimistically: (
    args: GetEnsNameOptimisticallyArgs
  ) => Promise<GetEnsNameReturnType>
}

/**
 * Extends the viem client with ENS optimistic actions
 * @param client - The viem {@link Client} object to add the ENS optimistic actions to
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { ensOptimisticActions } from './viem-plugin'
 *
 * const publicClient = createPublicClient({
 *   chain: mainnet,
 *   transport: http(),
 * }).extend(ensOptimisticActions)
 */
export const ensOptimisticActions = <
  TTransport extends Transport = Transport,
  TChain extends Chain = Chain,
  TAccount extends Account | undefined = Account | undefined,
>(
  client: Client<TTransport, TChain, TAccount>
): EnsOptimisticActions => ({
  getEnsNameOptimistically: (args) => getEnsNameOptimistically(client, args),
})

export async function getEnsNameOptimistically(
  client: Client<Transport, Chain, Account | undefined>,
  { address, l2Client }: GetEnsNameOptimisticallyArgs
): Promise<GetEnsNameReturnType> {
  const reverseNamespace = `${toCoinType(l2Client.chain.id).toString(16)}.reverse`

  const chainReverseResolver = await getEnsResolver(client, {
    name: reverseNamespace,
  })

  const l2ReverseRegistrar = await readContract(client, {
    address: chainReverseResolver,
    abi: parseAbi(['function l2Registrar() view returns (address)']),
    functionName: 'l2Registrar',
  })
    // This will throw an error on unsupported chains, because `chainReverseResolver` will be the DefaultReverseResolver which doesn't have a `l2Registrar` function
    .catch(() => null)

  if (!l2ReverseRegistrar) {
    return null
  }

  const chainResult = await resolveReverseName({
    address,
    l1Client: client,
    l2Client,
    reverseRegistrar: l2ReverseRegistrar,
  })

  if (!chainResult) {
    // Try the default reverse resolver
    const defaultReverseResolver = await getEnsResolver(client, {
      name: 'reverse',
    })

    const defaultReverseRegistrar = await readContract(client, {
      address: defaultReverseResolver,
      abi: parseAbi(['function defaultRegistrar() view returns (address)']),
      functionName: 'defaultRegistrar',
    })

    const defaultResult = await resolveReverseName({
      address,
      l1Client: client,
      l2Client: client,
      reverseRegistrar: defaultReverseRegistrar,
    })

    return defaultResult
  }

  return chainResult
}

async function resolveReverseName({
  address,
  l1Client,
  l2Client,
  reverseRegistrar,
}: {
  l1Client: Client<Transport, Chain, Account | undefined>
  l2Client: Client<Transport, Chain, Account | undefined>
  address: Address
  reverseRegistrar: Address
}) {
  const reverseName = await readContract(l2Client, {
    address: reverseRegistrar,
    abi: parseAbi(['function nameForAddr(address) view returns (string)']),
    functionName: 'nameForAddr',
    args: [address],
  })

  const forwardAddr = await getEnsAddress(l1Client, {
    name: reverseName,
    coinType: toCoinType(l2Client.chain.id),
  })

  if (forwardAddr === address.toLowerCase()) {
    return reverseName
  }

  return null
}
