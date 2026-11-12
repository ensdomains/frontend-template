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
  parseLabel,
  simulateRegistration,
} from '../lib/registration'
import {
  BatchFailedError,
  confirmBatch,
  confirmTransaction,
} from '../lib/transactions'
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
  /** True when calls go out as EIP-5792 batches */
  batched?: boolean
  /** Unix ms timestamp for when the commitment can be revealed */
  readyAt?: number
  /** Registered, but the ETH address record still needs to be set */
  needsRecord?: boolean
  /** False when progress can't be saved, so a reload would lose it */
  persisted?: boolean
  error?: string
  hashes: { commit?: Hash; register?: Hash }
}

/**
 * Progress that must survive until the name is registered. The secret has to
 * be the same at commit and register, so losing it means paying for a new
 * commit. Kept in memory, and saved to localStorage so a reload can resume.
 */
type Draft = {
  secret: Hex
  /** An EIP-5792 batch whose outcome isn't known yet, and which step sent it */
  batch?: { id: string; step: 'setup' | 'register' }
  /** The confirmed commit transaction */
  commitHash?: Hash
  /** The confirmed register transaction (the ETH record may still be unset) */
  registerHash?: Hash
}

const DRAFT_PREFIX = 'ens-examples:registration:'

function draftKey(p: RegistrationParams) {
  return `${DRAFT_PREFIX}${p.chainId}:${p.account.toLowerCase()}:${p.label}:${p.years}:${p.token}`
}

const HASH = /^0x[0-9a-f]{64}$/i

/** Reads a saved draft, ignoring anything malformed */
function loadDraft(p: RegistrationParams): Draft | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem(draftKey(p)) ?? 'null')
    if (!raw || !HASH.test(raw.secret)) return undefined
    return {
      secret: raw.secret,
      batch:
        typeof raw.batch?.id === 'string' &&
        (raw.batch.step === 'setup' || raw.batch.step === 'register')
          ? { id: raw.batch.id, step: raw.batch.step }
          : undefined,
      commitHash: HASH.test(raw.commitHash) ? raw.commitHash : undefined,
      registerHash: HASH.test(raw.registerHash) ? raw.registerHash : undefined,
    }
  } catch {
    return undefined
  }
}

/** Returns false if the draft couldn't be saved (e.g. private mode) */
function persistDraft(p: RegistrationParams, draft: Draft | undefined) {
  try {
    if (draft) localStorage.setItem(draftKey(p), JSON.stringify(draft))
    else localStorage.removeItem(draftKey(p))
    return true
  } catch {
    return false
  }
}

/**
 * Registrations on `chainId` by `account` that were committed in an earlier
 * visit, read from the saved draft keys, so they can be resumed even after
 * the name stops showing as available (e.g. registered but the address
 * record wasn't set yet).
 */
export function findSavedRegistrations(
  chainId: EnsChainId,
  account: Address
): RegistrationParams[] {
  const found: RegistrationParams[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(DRAFT_PREFIX)) continue
      const parts = key.slice(DRAFT_PREFIX.length).split(':')
      if (parts.length !== 5) continue
      const [id, owner, label, years, token] = parts
      const params = {
        chainId,
        account,
        label,
        years: Number(years),
        token: token as PaymentToken,
      }
      if (
        Number(id) !== chainId ||
        owner !== account.toLowerCase() ||
        !(token in PAYMENT_TOKENS) ||
        !Number.isInteger(params.years) ||
        params.years < 1 ||
        parseLabel(label)?.label !== label
      ) {
        continue
      }
      const draft = loadDraft(params)
      if (draft?.commitHash || draft?.batch || draft?.registerHash) {
        found.push(params)
      }
    }
  } catch {
    // Storage unavailable
  }
  return found
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
export function useRegistration(params: RegistrationParams) {
  const client = useEnsClient(params.chainId)
  const [state, setState] = useState<RegistrationState>({
    phase: 'idle',
    hashes: {},
  })
  const running = useRef(false)
  const mounted = useRef(true)
  // The source of truth for progress. localStorage is only a backup.
  const draftRef = useRef<Draft | undefined>(undefined)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const update = useCallback((next: Partial<RegistrationState>) => {
    if (mounted.current) setState((prev) => ({ ...prev, ...next }))
  }, [])

  // Load progress saved before a reload, once per registration. Re-running
  // (e.g. React StrictMode) must not drop a draft that only lives in memory.
  const loadedKey = useRef<string | undefined>(undefined)
  if (loadedKey.current !== draftKey(params)) {
    loadedKey.current = draftKey(params)
    draftRef.current = loadDraft(params)
  }

  const saveDraft = useCallback(
    (draft: Draft | undefined) => {
      draftRef.current = draft
      const persisted = persistDraft(params, draft)
      if (draft) update({ persisted })
    },
    [params, update]
  )

  /** Sends one transaction and waits for it (not a replacement) to succeed */
  const send = useCallback(
    async (call: Call) => {
      update({ txStatus: 'sign' })
      const hash = await sendTransaction(config, {
        chainId: params.chainId,
        account: params.account,
        ...call,
      })
      update({ txStatus: 'confirm' })
      return confirmTransaction(params.chainId, hash)
    },
    [params, update]
  )

  /**
   * Sends calls as one atomic EIP-5792 batch and returns the hash of the
   * transaction that ran them. The batch id is saved until its outcome is
   * known, so a reload can pick it back up instead of sending again.
   */
  const sendBatch = useCallback(
    async (calls: Call[], step: 'setup' | 'register') => {
      update({ batched: true, txStatus: 'sign' })
      const { id } = await sendCalls(config, {
        chainId: params.chainId,
        account: params.account,
        forceAtomic: true,
        calls,
      })
      saveDraft({ ...draftRef.current!, batch: { id, step } })
      update({ txStatus: 'confirm' })
      return finishBatch(id)
    },
    [params, saveDraft, update]
  )

  /** Waits for a saved batch. Forgets it only once the outcome is known. */
  const finishBatch = useCallback(
    async (id: string) => {
      try {
        const hash = await confirmBatch(id)
        saveDraft({ ...draftRef.current!, batch: undefined })
        return hash
      } catch (err) {
        if (err instanceof BatchFailedError) {
          saveDraft({ ...draftRef.current!, batch: undefined })
        }
        throw err
      }
    },
    [saveDraft]
  )

  /** Approves the registrar again if the price rose or approval was spent */
  const ensureAllowance = useCallback(
    async (paymentToken: Address) => {
      const registrar = getRegistrarAddress(client)
      const { total } = await getPrice(client, params)
      const allowance = await readContract(config, {
        chainId: params.chainId,
        address: paymentToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [params.account, registrar],
      })
      if (allowance >= total) return
      await send({
        to: paymentToken,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [registrar, total],
        }),
      })
    },
    [client, params, send]
  )

  /** Polls until the registrar accepts the commitment (~60 seconds) */
  const waitForCommitment = useCallback(
    async (register: RegisterWrite) => {
      update({ phase: 'wait', txStatus: undefined })

      while (mounted.current) {
        try {
          await simulateContract(config, {
            ...register,
            chainId: params.chainId,
            account: params.account,
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
          if (revert?.name === 'CommitmentTooOld') saveDraft(undefined)
          throw err
        }
      }
    },
    [params, saveDraft, update]
  )

  /** Setup (resolver, approval, commit) and the wait */
  const start = useCallback(async () => {
    if (running.current) return
    running.current = true
    update({ error: undefined })

    try {
      const draft = draftRef.current ?? { secret: randomSecret() }
      saveDraft(draft)
      const calls = await getRegistrationCalls(client, {
        ...params,
        secret: draft.secret,
      })

      if (draft.batch?.step === 'register') {
        // A register batch sent before a reload: finish it, never resend
        update({ phase: 'register', batched: true, txStatus: 'confirm' })
        const registerHash = await finishBatch(draft.batch.id)
        saveDraft(undefined)
        update({
          phase: 'done',
          txStatus: undefined,
          hashes: { commit: draft.commitHash, register: registerHash },
        })
        return
      }

      if (draft.registerHash) {
        // Registered before a reload; only the address record is left
        update({
          phase: 'register',
          needsRecord: true,
          hashes: { register: draft.registerHash },
        })
        return
      }

      if (draft.batch?.step === 'setup') {
        // A setup batch sent before a reload: wait for it to land
        update({ phase: 'setup', batched: true, txStatus: 'confirm' })
        const commitHash = await finishBatch(draft.batch.id)
        saveDraft({ ...draftRef.current!, commitHash })
      } else if (draft.commitHash) {
        // Resumed after a reload: make sure the commit actually landed
        update({ phase: 'setup', txStatus: 'confirm' })
        try {
          await confirmTransaction(params.chainId, draft.commitHash)
        } catch (err) {
          saveDraft({ secret: draft.secret })
          throw err
        }
      } else {
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

        // Resolver, approval, and commit. The commit is always last, so its
        // hash is the one that's saved.
        let commitHash: Hash | undefined
        if (
          calls.setup.length > 1 &&
          (await supportsAtomicBatch(params.chainId))
        ) {
          commitHash = await sendBatch(calls.setup, 'setup')
        } else {
          update({ batched: false })
          for (const call of calls.setup) commitHash = await send(call)
        }
        saveDraft({ ...draftRef.current!, commitHash })
      }

      update({ hashes: { commit: draftRef.current?.commitHash } })
      await waitForCommitment(calls.registerWrite)
    } catch (err) {
      update({ error: getErrorMessage(err) })
    } finally {
      running.current = false
    }
  }, [
    client,
    finishBatch,
    params,
    saveDraft,
    send,
    sendBatch,
    update,
    waitForCommitment,
  ])

  /** Reveal the commitment, pay, and set the name's ETH address */
  const register = useCallback(async () => {
    if (running.current) return
    running.current = true
    update({ phase: 'register', error: undefined, needsRecord: false })

    try {
      const draft = draftRef.current
      if (draft?.batch) {
        // Never send again while an earlier batch's outcome is unknown
        throw new Error('A transaction is still pending. Reload to check it')
      }
      if (!draft?.commitHash) {
        throw new Error('No commitment found. Please start again')
      }
      const calls = await getRegistrationCalls(client, {
        ...params,
        secret: draft.secret,
      })
      const [registerCall, setAddressCall] = calls.register
      let registerHash = draft.registerHash

      if (!registerHash) {
        await ensureAllowance(calls.paymentToken)
        if (await supportsAtomicBatch(params.chainId)) {
          // Register and set the record in one confirmation
          registerHash = await sendBatch(calls.register, 'register')
        } else {
          // Save progress between the two, so the record can be retried
          update({ batched: false })
          registerHash = await send(registerCall)
          saveDraft({ ...draft, registerHash })
          update({ needsRecord: true })
          await send(setAddressCall)
        }
      } else {
        // Registered earlier, but setting the record didn't finish
        await send(setAddressCall)
      }

      saveDraft(undefined)
      update({
        phase: 'done',
        txStatus: undefined,
        hashes: { commit: draft.commitHash, register: registerHash },
      })
    } catch (err) {
      update({ error: getErrorMessage(err) })
    } finally {
      running.current = false
    }
  }, [client, ensureAllowance, params, saveDraft, send, sendBatch, update])

  /**
   * Leave the flow. Progress is forgotten only if nothing has been sent that
   * the saved secret is needed for (a commit, or a batch that may contain one).
   */
  const reset = useCallback(() => {
    if (running.current) return
    const draft = draftRef.current
    if (!draft?.commitHash && !draft?.batch && !draft?.registerHash) {
      saveDraft(undefined)
    }
    setState({ phase: 'idle', hashes: {} })
  }, [saveDraft])

  return { state, start, register, reset }
}
