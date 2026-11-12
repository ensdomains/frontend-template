import { randomSecret } from '@ensdomains/ensjs/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type Address,
  type Hash,
  type Hex,
  encodeFunctionData,
  erc20Abi,
} from 'viem'
import {
  getCapabilities,
  readContract,
  sendCalls,
  sendTransaction,
  simulateContract,
  waitForCallsStatus,
  waitForTransactionReceipt,
} from 'wagmi/actions'

import type { EnsChainId } from '../lib/chains'
import {
  type Call,
  PAYMENT_TOKENS,
  type PaymentToken,
  getErrorMessage,
  getPrice,
  getRegistrarAddress,
  getRegistrationCalls,
  getRevertError,
  simulateRegistration,
} from '../lib/registration'
import { config } from '../lib/wagmi'
import { useEnsClient } from './useEnsClient'

export type RegistrationParams = {
  chainId: EnsChainId
  account: Address
  label: string
  years: number
  token: PaymentToken
}

export type Phase = 'idle' | 'setup' | 'wait' | 'register' | 'done'

export type RegistrationState = {
  phase: Phase
  /** What the current transaction is waiting on */
  txStatus?: 'sign' | 'confirm'
  /** True while the registration is being simulated */
  checking?: boolean
  /** True when the setup calls go out as one EIP-5792 batch */
  batched?: boolean
  /** Unix ms timestamp for when the commitment can be revealed */
  readyAt?: number
  error?: string
  hashes: { setup?: Hash; register?: Hash }
}

/**
 * Saved in localStorage between page loads. The secret must be the same at
 * commit and register, so losing it means paying for a new commit.
 */
type Draft = {
  secret: Hex
  /** EIP-5792 batch id, while a batched setup is in flight */
  batchId?: string
  /** The commit transaction, once sent */
  commitHash?: Hash
}

const DRAFT_PREFIX = 'ens-examples:registration:'

function draftKey(p: RegistrationParams) {
  return `${DRAFT_PREFIX}${p.chainId}:${p.account.toLowerCase()}:${p.label}:${p.years}:${p.token}`
}

function loadDraft(p: RegistrationParams): Draft | undefined {
  try {
    const raw = localStorage.getItem(draftKey(p))
    const draft = raw ? (JSON.parse(raw) as Partial<Draft>) : undefined
    // Only trust a well-formed 32-byte secret
    return draft && /^0x[0-9a-f]{64}$/i.test(draft.secret ?? '')
      ? (draft as Draft)
      : undefined
  } catch {
    return undefined
  }
}

function saveDraft(p: RegistrationParams, draft: Draft | undefined) {
  try {
    if (draft) localStorage.setItem(draftKey(p), JSON.stringify(draft))
    else localStorage.removeItem(draftKey(p))
  } catch {
    // Storage can be unavailable (private mode). The flow still works.
  }
}

/**
 * Whether the wallet can run calls atomically (EIP-5792). Only `supported`
 * counts: `ready` means sending a batch would prompt an EIP-7702 account
 * upgrade, which a registration shouldn't trigger.
 */
async function supportsAtomicBatch(chainId: EnsChainId) {
  try {
    const capabilities = await getCapabilities(config, { chainId })
    return capabilities.atomic?.status === 'supported'
  } catch {
    return false
  }
}

type RegisterWrite = Awaited<
  ReturnType<typeof getRegistrationCalls>
>['registerWrite']

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs an ENSv2 registration for the connected account. `start` runs the
 * setup and the wait, `register` finishes it. A reload mid-way resumes from
 * the saved commit.
 */
export function useRegistration(params: RegistrationParams | undefined) {
  const client = useEnsClient(params?.chainId ?? 1)
  const [state, setState] = useState<RegistrationState>({
    phase: 'idle',
    hashes: {},
  })
  const running = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const update = useCallback((next: Partial<RegistrationState>) => {
    if (mounted.current) setState((prev) => ({ ...prev, ...next }))
  }, [])

  // Pick up a registration that was committed before the page was closed
  useEffect(() => {
    if (!params) return
    const draft = loadDraft(params)
    setState({
      phase: draft?.commitHash || draft?.batchId ? 'wait' : 'idle',
      hashes: { setup: draft?.commitHash },
    })
  }, [params])

  /** Sends one transaction and waits for it to succeed */
  const send = useCallback(
    async (p: RegistrationParams, call: Call) => {
      update({ txStatus: 'sign' })
      const hash = await sendTransaction(config, {
        chainId: p.chainId,
        account: p.account,
        ...call,
      })
      update({ txStatus: 'confirm' })
      const receipt = await waitForTransactionReceipt(config, {
        chainId: p.chainId,
        hash,
      })
      if (receipt.status !== 'success') throw new Error('Transaction failed')
      return hash
    },
    [update]
  )

  /** Approves the registrar again if the price rose or approval was spent */
  const ensureAllowance = useCallback(
    async (p: RegistrationParams, paymentToken: Address) => {
      const registrar = getRegistrarAddress(client)
      const { total } = await getPrice(client, p)
      const allowance = await readContract(config, {
        chainId: p.chainId,
        address: paymentToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [p.account, registrar],
      })
      if (allowance >= total) return
      await send(p, {
        to: paymentToken,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [registrar, total],
        }),
      })
    },
    [client, send]
  )

  /** Polls until the registrar accepts the commitment (~60 seconds) */
  const waitForCommitment = useCallback(
    async (p: RegistrationParams, register: RegisterWrite) => {
      update({ phase: 'wait', txStatus: undefined })

      while (mounted.current) {
        try {
          await simulateContract(config, {
            ...register,
            chainId: p.chainId,
            account: p.account,
          })
          // A simulated register succeeds, so the wait is over
          update({ readyAt: Date.now() })
          return
        } catch (err) {
          const revert = getRevertError(err)
          if (revert?.name === 'CommitmentTooNew') {
            const [, validFrom, blockTimestamp] = revert.args as [
              Hex,
              bigint,
              bigint,
            ]
            const waitMs = Number(validFrom - blockTimestamp) * 1000 + 1500
            update({ readyAt: Date.now() + waitMs })
            await sleep(Math.max(waitMs, 3000))
            continue
          }
          // The allowance can be spent elsewhere during the wait. It's topped
          // up right before registering, so the wait itself is over.
          if (
            revert?.name === 'ERC20InsufficientAllowance' ||
            revert?.name === 'SafeERC20FailedOperation'
          ) {
            update({ readyAt: Date.now() })
            return
          }
          if (revert?.name === 'CommitmentTooOld') saveDraft(p, undefined)
          throw err
        }
      }
    },
    [update]
  )

  /** Setup (resolver, approval, commit) and the wait */
  const start = useCallback(async () => {
    if (!params || running.current) return
    running.current = true
    update({ error: undefined })

    try {
      const draft = loadDraft(params) ?? { secret: randomSecret() }
      saveDraft(params, draft)
      const calls = await getRegistrationCalls(client, {
        ...params,
        secret: draft.secret,
      })

      // A batch sent before a reload: wait for it to land
      if (draft.batchId && !draft.commitHash) {
        update({ phase: 'setup', batched: true, txStatus: 'confirm' })
        draft.commitHash = await finishBatch(params, draft)
      }

      if (!draft.commitHash) {
        update({ phase: 'setup' })

        const balance = await readContract(config, {
          chainId: params.chainId,
          address: calls.paymentToken,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [params.account],
        })
        if (balance < calls.price) {
          const { symbol } = PAYMENT_TOKENS[params.token]
          throw new Error(`Not enough ${symbol} to register this name`)
        }

        // Simulate everything first so nobody pays gas for a doomed attempt
        update({ checking: true })
        let failure: unknown
        try {
          failure = await simulateRegistration(client, params.account, calls)
        } catch (err) {
          // Not every RPC supports eth_simulateV1. Carry on without it.
          console.warn('Skipping registration simulation', err)
        } finally {
          update({ checking: false })
        }
        if (failure) throw failure

        if (await supportsAtomicBatch(params.chainId)) {
          // Resolver, approval, and commit in one wallet confirmation
          update({ batched: true, txStatus: 'sign' })
          const { id } = await sendCalls(config, {
            chainId: params.chainId,
            account: params.account,
            forceAtomic: true,
            calls: calls.setup,
          })
          draft.batchId = id
          saveDraft(params, draft)
          update({ txStatus: 'confirm' })
          draft.commitHash = await finishBatch(params, draft)
        } else {
          // One transaction per call. The commit is always last.
          update({ batched: false })
          let hash: Hash | undefined
          for (const call of calls.setup) hash = await send(params, call)
          draft.commitHash = hash
        }
        saveDraft(params, draft)
      } else {
        // Resumed: make sure the saved commit actually landed
        update({ phase: 'setup', txStatus: 'confirm' })
        const receipt = await waitForTransactionReceipt(config, {
          chainId: params.chainId,
          hash: draft.commitHash,
        })
        if (receipt.status !== 'success') {
          saveDraft(params, { secret: draft.secret })
          throw new Error('The commit transaction failed. Please try again')
        }
      }

      update({ hashes: { setup: draft.commitHash } })
      await waitForCommitment(params, calls.registerWrite)
    } catch (err) {
      update({ error: getErrorMessage(err) })
    } finally {
      running.current = false
    }
  }, [client, params, send, update, waitForCommitment])

  /** Reveal the commitment and pay for the name */
  const register = useCallback(async () => {
    if (!params || running.current) return
    running.current = true
    update({ phase: 'register', error: undefined })

    try {
      const draft = loadDraft(params)
      if (!draft?.commitHash)
        throw new Error('No commitment found. Start again')
      const calls = await getRegistrationCalls(client, {
        ...params,
        secret: draft.secret,
      })
      await ensureAllowance(params, calls.paymentToken)
      const hash = await send(params, calls.register)
      saveDraft(params, undefined)
      update({
        phase: 'done',
        txStatus: undefined,
        hashes: { setup: draft.commitHash, register: hash },
      })
    } catch (err) {
      update({ error: getErrorMessage(err) })
    } finally {
      running.current = false
    }
  }, [client, ensureAllowance, params, send, update])

  /** Forget a saved commitment and start over */
  const reset = useCallback(() => {
    if (!params || running.current) return
    saveDraft(params, undefined)
    setState({ phase: 'idle', hashes: {} })
  }, [params])

  return { state, start, register, reset }
}

/**
 * Waits for an EIP-5792 batch and returns the hash of its last call (the
 * commit). The batch id is forgotten either way, so a failed batch can be
 * retried.
 */
async function finishBatch(p: RegistrationParams, draft: Draft) {
  try {
    const result = await waitForCallsStatus(config, {
      id: draft.batchId!,
      timeout: 15 * 60_000,
    })
    const last = result.receipts?.at(-1)
    if (result.status !== 'success' || !last) {
      throw new Error('The wallet batch failed')
    }
    return last.transactionHash
  } finally {
    draft.batchId = undefined
    saveDraft(p, draft)
  }
}
