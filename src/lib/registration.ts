/**
 * ENSv2 .eth registration, as plain functions with no React.
 *
 * Registering takes three steps, the same as ENSv1 except for payment:
 *
 * 1. Commit to a hash of the registration, so nobody can front-run it.
 * 2. Wait at least 60 seconds (`MIN_COMMITMENT_AGE`).
 * 3. Register, revealing the details. The registrar takes payment in an
 *    ERC-20 (see `PAYMENT_TOKENS`), so it needs an approval first.
 *
 * In ENSv2, every name points at a resolver its owner controls. Here that's a
 * personal `PermissionedResolver` ("OwnedResolver") deployed through the ENS
 * `VerifiableFactory` at an address derived from the owner, so it can be
 * known before it exists, put in the commitment, and reused for every name
 * the owner registers. The ETH address record is set in the same batch as
 * the register call, so the name resolves the moment it's registered.
 *
 * Nothing before the register step may contain the name in plaintext (only
 * the commitment hash), or someone watching the mempool could front-run it.
 */
import { getChainContractAddress } from '@ensdomains/ensjs/chain'
import { getRegisterPrice } from '@ensdomains/ensjs/public'
import {
  commitNameWriteParameters,
  registerNameWriteParameters,
} from '@ensdomains/ensjs/wallet'
import { setPrimaryNameWriteParameters } from '@ensdomains/ensjs/wallet/v1'
import {
  type Account,
  type Address,
  BaseError,
  type Client,
  ContractFunctionRevertedError,
  type Hex,
  type Transport,
  concat,
  decodeErrorResult,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  getContractAddress,
  isAddress,
  keccak256,
  parseAbi,
  stringToBytes,
  toHex,
} from 'viem'
import { toAccount } from 'viem/accounts'
import { getBlock, getCode, readContract, simulateBlocks } from 'viem/actions'
import { normalize, packetToBytes } from 'viem/ens'

import type { EnsContractsChain } from '../hooks/useEnsClient'
import { type EnsChainId, mainnet, sepolia } from './chains'

type EnsClient = Client<Transport, EnsContractsChain>

export const SECONDS_PER_YEAR = 31_536_000

export type PaymentToken = 'usdc' | 'dai' | 'mock'

export type PaymentTokenInfo = {
  id: PaymentToken
  /** Shown next to amounts */
  symbol: string
  /** Shown in the token picker */
  label: string
  decimals: number
  /** An ENS deployment contract (address from ENSjs), or a fixed address */
  contract: 'usdc' | 'dai' | Address
  /** Testnet only: anyone can call `mint(to, amount)` */
  mintable?: boolean
  /** Testnet only: where to get some */
  faucetUrl?: string
}

/**
 * The ERC-20s offered at checkout on each network. The registrar's price
 * oracle decides which tokens it accepts (`isPaymentToken`); these are a
 * subset of those.
 */
export const PAYMENT_TOKENS: Record<EnsChainId, readonly PaymentTokenInfo[]> = {
  [mainnet.id]: [
    {
      id: 'usdc',
      symbol: 'USDC',
      label: 'USDC',
      decimals: 6,
      contract: 'usdc',
    },
    { id: 'dai', symbol: 'DAI', label: 'DAI', decimals: 18, contract: 'dai' },
  ],
  [sepolia.id]: [
    {
      id: 'usdc',
      symbol: 'USDC',
      label: 'USDC',
      decimals: 6,
      // Circle's Sepolia USDC, which the ENS registrar also accepts
      contract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      faucetUrl: 'https://faucet.circle.com',
    },
    {
      id: 'mock',
      symbol: 'mock USD',
      label: 'Mock',
      decimals: 6,
      // ENS's own test token: a USDC-like ERC-20 anyone can mint
      contract: 'usdc',
      mintable: true,
    },
  ],
}

export function getPaymentTokens(chainId: EnsChainId) {
  return PAYMENT_TOKENS[chainId]
}

/** The token's details on this network, or undefined if it isn't offered */
export function getPaymentToken(chainId: EnsChainId, id: string) {
  return PAYMENT_TOKENS[chainId].find((t) => t.id === id)
}

export function getPaymentTokenAddress(client: EnsClient, id: PaymentToken) {
  const token = getPaymentToken(client.chain.id as EnsChainId, id)
  if (!token) throw new Error(`${id} isn't a payment token on this network`)
  return isAddress(token.contract)
    ? token.contract
    : getChainContractAddress({ chain: client.chain, contract: token.contract })
}

export function getRegistrarAddress(client: EnsClient) {
  return getChainContractAddress({
    chain: client.chain,
    contract: 'ensEthRegistrar',
  })
}

export function yearsToSeconds(years: number) {
  return Math.round(years * SECONDS_PER_YEAR)
}

// -----------------------------------------------------------------------------
// Names
// -----------------------------------------------------------------------------

export type ParsedLabel =
  { label: string; error?: undefined } | { label?: undefined; error: string }

/**
 * Turns user input into a normalized .eth label (the part before ".eth").
 * Always normalize (ENSIP-15) before registering, or the name may be
 * unreachable or look like a different name.
 */
export function parseLabel(input: string): ParsedLabel | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined

  let label: string
  try {
    label = normalize(trimmed.replace(/\.eth$/i, ''))
  } catch {
    return { error: 'Invalid name' }
  }

  if (label.includes('.')) return { error: 'Subnames are not supported' }
  if ([...label].length < 3) return { error: 'Must be 3+ characters' }
  if (new TextEncoder().encode(label).length > 255) {
    return { error: 'Name is too long' }
  }

  return { label }
}

// -----------------------------------------------------------------------------
// Price
// -----------------------------------------------------------------------------

/** Registration price in the payment token's smallest unit */
export async function getPrice(
  client: EnsClient,
  { label, years, token }: { label: string; years: number; token: PaymentToken }
) {
  const { base, premium } = await getRegisterPrice(client, {
    label,
    duration: BigInt(yearsToSeconds(years)),
    paymentToken: getPaymentTokenAddress(client, token),
  })
  return { base, premium, total: base + premium }
}

// -----------------------------------------------------------------------------
// Owned resolver
// -----------------------------------------------------------------------------

const verifiableFactoryAbi = parseAbi([
  'function proxyLogic() view returns (address)',
  'function deployProxy(address implementation, uint256 salt, bytes data) returns (address)',
])

const permissionedResolverAbi = parseAbi([
  'function initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)',
  'function setAddress(bytes name, uint256 coinType, bytes addressBytes)',
])

/**
 * Every role on the resolver, granted to the owner. ENSv2 access control packs
 * each role into a 4-bit group, so a 1 in every nibble means "all roles".
 */
const ALL_ROLES = BigInt(`0x${'1'.repeat(64)}`)

/** The salt the ENS app and CLI use for an account's OwnedResolver */
function ownedResolverSalt(owner: Address) {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }],
        [keccak256(stringToBytes('OwnedResolver')), owner, 0n]
      )
    )
  )
}

/**
 * Where `owner`'s resolver lives (or will, once deployed). The factory deploys
 * a minimal proxy with CREATE2, salted with the deployer's address, so only
 * the owner can deploy to it.
 */
export async function getOwnedResolver(client: EnsClient, owner: Address) {
  const factory = getChainContractAddress({
    chain: client.chain,
    contract: 'ensVerifiableFactory',
  })
  const proxyLogic = await readContract(client, {
    address: factory,
    abi: verifiableFactoryAbi,
    functionName: 'proxyLogic',
  })
  const salt = ownedResolverSalt(owner)
  const outerSalt = keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }],
      [owner, salt]
    )
  )
  const address = getContractAddress({
    from: factory,
    opcode: 'CREATE2',
    salt: outerSalt,
    bytecode: concat([
      '0x3d604d80600a3d3981f3363d3d373d3d3d363d73',
      proxyLogic,
      '0x5af43d82803e903d91602b57fd5bf3',
      outerSalt,
    ]),
  })
  const code = await getCode(client, { address })

  return { address, salt, factory, isDeployed: !!code && code !== '0x' }
}

/** `setAddress` for a name's ETH address (coin type 60) on a v2 resolver */
function encodeSetEthAddress(name: string, address: Address) {
  return encodeFunctionData({
    abi: permissionedResolverAbi,
    functionName: 'setAddress',
    args: [toHex(packetToBytes(name)), 60n, address],
  })
}

// -----------------------------------------------------------------------------
// Transactions
// -----------------------------------------------------------------------------

export type Call = { to: Address; data: Hex }

/** What each transaction in a registration does, for showing progress */
export type TxKind = 'resolver' | 'approve' | 'commit' | 'register' | 'record'

export type RegistrationSetup = {
  /** The connected account, which pays, owns the name, and owns the resolver */
  account: Address
  label: string
  years: number
  token: PaymentToken
  /** Random 32 bytes, kept until the register step */
  secret: Hex
}

/** The exact registration that's committed to and later revealed */
function registrationParams(
  setup: RegistrationSetup,
  resolver: Address,
  paymentToken: Address
) {
  return {
    label: setup.label,
    owner: setup.account,
    duration: yearsToSeconds(setup.years),
    secret: setup.secret,
    resolverAddress: resolver,
    paymentToken,
  }
}

/** ENSjs write builders only read `chain` and `account` from the client */
function asSender(client: EnsClient, account: Address) {
  return { ...client, account: toAccount(account) } as Client<
    Transport,
    EnsContractsChain,
    Account
  >
}

function toCall(params: {
  address: Address
  abi: readonly unknown[]
  functionName: string
  args: readonly unknown[]
}): Call {
  return {
    to: params.address,
    data: encodeFunctionData(
      params as Parameters<typeof encodeFunctionData>[0]
    ),
  }
}

/**
 * Builds every call in a registration as raw `{ to, data }`, so the same
 * calls can be simulated, sent one at a time, or batched with EIP-5792
 * `wallet_sendCalls`.
 *
 * - `setup` runs before the wait: deploy the resolver if needed, approve
 *   payment if needed, and commit. None of it reveals the name.
 * - `register` runs after the wait: register, then set the name's ETH
 *   address on the resolver.
 */
export async function getRegistrationCalls(
  client: EnsClient,
  setup: RegistrationSetup
) {
  const name = `${setup.label}.eth`
  const resolver = await getOwnedResolver(client, setup.account)
  const paymentToken = getPaymentTokenAddress(client, setup.token)
  const registrar = getRegistrarAddress(client)
  const { total } = await getPrice(client, setup)
  const allowance = await readContract(client, {
    address: paymentToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [setup.account, registrar],
  })

  const sender = asSender(client, setup.account)
  const params = registrationParams(setup, resolver.address, paymentToken)
  const setEthAddress = encodeSetEthAddress(name, setup.account)

  // Deploy the resolver on the first registration, granting the owner every
  // role. No records yet: setting this name's record now would reveal it.
  const deployResolverCall: Call | undefined = resolver.isDeployed
    ? undefined
    : {
        to: resolver.factory,
        data: encodeFunctionData({
          abi: verifiableFactoryAbi,
          functionName: 'deployProxy',
          args: [
            getChainContractAddress({
              chain: client.chain,
              contract: 'ensPermissionedResolverImpl',
            }),
            resolver.salt,
            encodeFunctionData({
              abi: permissionedResolverAbi,
              functionName: 'initialize',
              args: [[{ account: setup.account, roleBitmap: ALL_ROLES }], []],
            }),
          ],
        }),
      }

  const approveCall: Call | undefined =
    allowance < total
      ? {
          to: paymentToken,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            // Approve the exact price, not an unlimited amount
            args: [registrar, total],
          }),
        }
      : undefined

  const commitCall = toCall(commitNameWriteParameters(sender, params))
  const registerWrite = registerNameWriteParameters(sender, params)

  return {
    resolver: resolver.address,
    price: total,
    paymentToken,
    setup: [
      ...(deployResolverCall ? [deployResolverCall] : []),
      ...(approveCall ? [approveCall] : []),
      commitCall,
    ],
    /** What each `setup` call does, in the same order */
    setupKinds: [
      ...(deployResolverCall ? ['resolver' as const] : []),
      ...(approveCall ? ['approve' as const] : []),
      'commit' as const,
    ] satisfies TxKind[],
    register: [
      toCall(registerWrite),
      { to: resolver.address, data: setEthAddress },
    ],
    /**
     * The approval, if the allowance is still short of the price. Needed again
     * at register time when something used up the approval from setup.
     */
    approve: approveCall,
    /** The register call with its ABI, for `simulateContract` */
    registerWrite: {
      address: registerWrite.address,
      abi: registerWrite.abi,
      functionName: registerWrite.functionName,
      args: registerWrite.args,
    },
  }
}

/**
 * Replays the whole registration (setup, then register after the wait)
 * against current chain state with `eth_simulateV1`, so a registration that
 * would fail is caught before any gas is spent. Resolves to the first failing
 * call's error, or `undefined` if everything succeeds. Throws if the RPC
 * doesn't support simulation.
 */
export async function simulateRegistration(
  client: EnsClient,
  account: Address,
  calls: { setup: Call[]; register: Call[] }
) {
  const { timestamp } = await getBlock(client)
  const from = (call: Call) => ({ account, ...call })

  const blocks = await simulateBlocks(client, {
    blocks: [
      { calls: calls.setup.map(from) },
      {
        // Comfortably past the minimum commitment age
        blockOverrides: { time: timestamp + 600n },
        calls: calls.register.map(from),
      },
    ],
  })

  for (const block of blocks) {
    for (const result of block.calls) {
      if (result.status === 'failure') return result.error
    }
  }
  return undefined
}

/**
 * Sets `name` as the account's primary name (the reverse record for
 * <address>.addr.reverse), so apps show the name instead of the address.
 * Primary names are only valid when the name also resolves to the address,
 * which the registration above takes care of.
 */
export function getSetPrimaryNameCall(
  client: EnsClient,
  account: Address,
  name: string
): Call {
  return toCall(
    setPrimaryNameWriteParameters(asSender(client, account), { name })
  )
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

/** Errors the registrar (and the tokens it calls) can revert with */
const registrationErrors = [
  ...parseAbi([
    'error CommitmentTooNew(bytes32 commitment, uint64 validFrom, uint64 blockTimestamp)',
    'error CommitmentTooOld(bytes32 commitment, uint64 validTo, uint64 blockTimestamp)',
    'error DurationTooShort(uint64 duration, uint64 minDuration)',
    'error NameNotAvailable(string label)',
    'error NotValid(string label)',
    'error PaymentTokenNotSupported(address paymentToken)',
    'error SafeERC20FailedOperation(address token)',
    'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
    'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  ]),
]

/** Decodes the custom error name and args from a contract revert */
export function getRevertError(err: unknown) {
  if (!(err instanceof BaseError)) return undefined
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
  if (!(revert instanceof ContractFunctionRevertedError)) return undefined
  if (revert.data) {
    return { name: revert.data.errorName, args: revert.data.args ?? [] }
  }
  if (!revert.raw) return undefined
  try {
    const decoded = decodeErrorResult({
      abi: registrationErrors,
      data: revert.raw,
    })
    return { name: decoded.errorName, args: decoded.args ?? [] }
  } catch {
    return undefined
  }
}

/** A short, human message for anything thrown during registration */
export function getErrorMessage(err: unknown) {
  const revert = getRevertError(err)
  if (revert) {
    switch (revert.name) {
      case 'NameNotAvailable':
        return 'This name was just registered by someone else'
      case 'CommitmentTooOld':
        return 'Your commitment expired. Please start again'
      case 'DurationTooShort':
        return 'The registration period is too short'
      case 'PaymentTokenNotSupported':
        return 'That payment token is not supported'
      case 'ERC20InsufficientBalance':
      case 'SafeERC20FailedOperation':
        return 'Not enough tokens to pay for this name'
      case 'ERC20InsufficientAllowance':
        return 'Token approval is too low. Please try again'
      default:
        return `Transaction would fail (${revert.name})`
    }
  }

  if (err instanceof BaseError) {
    if (err.walk((e) => (e as { code?: number }).code === 4001)) {
      return 'Transaction rejected'
    }
    return err.shortMessage
  }

  return err instanceof Error ? err.message : 'Something went wrong'
}
