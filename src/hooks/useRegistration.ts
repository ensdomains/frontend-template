import { randomSecret } from '@ensdomains/ensjs/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Address, type Hash, type Hex, erc20Abi } from 'viem'
import {
  getCapabilities,
  readContract,
  sendCalls,
  getConnection,
  sendTransaction,
  simulateContract,
} from 'wagmi/actions'

import type { EnsChainId } from '../lib/chains'
import {
  type Call,
  type PaymentToken,
  type TxKind,
  getPaymentToken,
  getErrorMessage,
  getRegistrationCalls,
  getRevertError,
  parseLabel,
  simulateRegistration,
} from '../lib/registration'
import {
  BatchFailedError,
  TransactionFailedError,
  confirmBatch,
  confirmTransaction,
  isAtomicBatchSupported,
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

/** The steps that send transactions */
type Step = 'setup' | 'register'

/** One transaction within a step, when they're sent one at a time */
export type TxProgress = {
  kind: TxKind
  status: 'pending' | 'active' | 'done'
}

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
  /** The commitment has matured, so the name can be registered */
  ready?: boolean
  /** Registered, but the ETH address record still needs to be set */
  needsRecord?: boolean
  /** False when progress can't be saved, so a reload would lose it */
  persisted?: boolean
  error?: string
  hashes: { commit?: Hash; register?: Hash }
  /** The transactions in each step, once known */
  txs: { setup?: TxProgress[]; register?: TxProgress[] }
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
  /**
   * A transaction that was sent but whose outcome isn't known yet. Saved the
   * moment the wallet returns its hash, so a reload checks it instead of
   * sending something else (e.g. a second register).
   */
  pending?: { hash: Hash; kind: TxKind }
}

const TX_KINDS: readonly TxKind[] = [
  'resolver',
  'approve',
  'commit',
  'register',
  'record',
]

/** Whether anything was sent that the saved secret or hashes are needed for */
function hasProgress(draft: Draft | undefined) {
  return !!(
    draft?.commitHash ||
    draft?.batch ||
    draft?.registerHash ||
    draft?.pending
  )
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
      pending:
        HASH.test(raw.pending?.hash) && TX_KINDS.includes(raw.pending.kind)
          ? { hash: raw.pending.hash, kind: raw.pending.kind }
          : undefined,
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
        !getPaymentToken(chainId, token) ||
        !Number.isInteger(params.years) ||
        params.years < 1 ||
        parseLabel(label)?.label !== label
      ) {
        continue
      }
      if (hasProgress(loadDraft(params))) found.push(params)
    }
  } catch {
    // Storage unavailable
  }
  return found
}

/**
 * Checked again right before sending, since the wallet may have changed since
 * the page loaded. See `isAtomicBatchSupported`.
 */
async function supportsAtomicBatch(chainId: EnsChainId) {
  try {
    return isAtomicBatchSupported(await getCapabilities(config, { chainId }))
  } catch {
    return false
  }
}

type RegisterWrite = Awaited<
  ReturnType<typeof getRegistrationCalls>
>['registerWrite']

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** The flow was closed (or the network changed) while it was running */
class FlowClosedError extends Error {}

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
    txs: {},
  })
  const running = useRef(false)
  const mounted = useRef(true)
  // The source of truth for progress, starting from what was saved before a
  // reload. localStorage is only a backup. Render this hook with a `key` per
  // registration so a different one starts from its own draft.
  const [savedDraft] = useState(() => loadDraft(params))
  const draftRef = useRef<Draft | undefined>(savedDraft)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const update = useCallback((next: Partial<RegistrationState>) => {
    if (mounted.current) setState((prev) => ({ ...prev, ...next }))
  }, [])

  /** Lists the transactions a step is about to send */
  const planTxs = useCallback(
    (step: Step, kinds: TxKind[], done: TxKind[] = []) => {
      const txs = kinds.map((kind) => ({
        kind,
        status: done.includes(kind) ? ('done' as const) : ('pending' as const),
      }))
      if (mounted.current) {
        setState((prev) => ({ ...prev, txs: { ...prev.txs, [step]: txs } }))
      }
    },
    []
  )

  const markTx = useCallback(
    (step: Step, kind: TxKind, status: TxProgress['status']) => {
      if (!mounted.current) return
      setState((prev) => ({
        ...prev,
        txs: {
          ...prev.txs,
          [step]: prev.txs[step]?.map((tx) =>
            tx.kind === kind ? { ...tx, status } : tx
          ),
        },
      }))
    },
    []
  )

  const saveDraft = useCallback(
    (draft: Draft | undefined) => {
      draftRef.current = draft
      const persisted = persistDraft(params, draft)
      if (draft) update({ persisted })
    },
    [params, update]
  )

  /**
   * Called before every wallet request. Once the flow is closed (which also
   * happens when the network toggle or account changes), nothing new is
   * sent, even if an earlier step is still finishing in the background.
   */
  const assertActive = useCallback(() => {
    if (!mounted.current) throw new FlowClosedError()
    const { address } = getConnection(config)
    if (address?.toLowerCase() !== params.account.toLowerCase()) {
      throw new Error('The connected account changed. Go back and start again')
    }
  }, [params])

  /**
   * Waits for a sent transaction and records what it did. A definite failure
   * forgets it; any other error (e.g. a timeout) keeps it, so it's checked
   * again instead of being sent twice.
   */
  const settle = useCallback(
    async (pending: NonNullable<Draft['pending']>) => {
      let landed: Hash
      try {
        landed = await confirmTransaction(params.chainId, pending.hash)
      } catch (err) {
        if (err instanceof TransactionFailedError) {
          saveDraft({ ...draftRef.current!, pending: undefined })
        }
        throw err
      }
      const next: Draft = { ...draftRef.current!, pending: undefined }
      if (pending.kind === 'commit') next.commitHash = landed
      if (pending.kind === 'register') next.registerHash = landed
      saveDraft(next)
      return landed
    },
    [params, saveDraft]
  )

  /** Sends one call and waits for it, marking its progress in `state.txs` */
  const send = useCallback(
    async (call: Call, step: Step, kind: TxKind) => {
      assertActive()
      update({ txStatus: 'sign' })
      markTx(step, kind, 'active')
      const hash = await sendTransaction(config, {
        chainId: params.chainId,
        account: params.account,
        to: call.to,
        data: call.data,
      })
      saveDraft({ ...draftRef.current!, pending: { hash, kind } })
      update({ txStatus: 'confirm' })
      const landed = await settle({ hash, kind })
      markTx(step, kind, 'done')
      return landed
    },
    [assertActive, markTx, params, saveDraft, settle, update]
  )

  /**
   * Finishes a transaction sent before a reload or an error. Returns true if
   * it was the last one (the address record), so the registration is done.
   */
  const reconcilePending = useCallback(async () => {
    const pending = draftRef.current?.pending
    if (!pending) return false
    const step = pending.kind === 'register' || pending.kind === 'record'
    update({ phase: step ? 'register' : 'setup', txStatus: 'confirm' })
    await settle(pending)
    update({ txStatus: undefined })
    return pending.kind === 'record'
  }, [settle, update])

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

  /**
   * Sends calls as one atomic EIP-5792 batch and returns the hash of the
   * transaction that ran them. The batch id is saved until its outcome is
   * known, so a reload can pick it back up instead of sending again.
   */
  const sendBatch = useCallback(
    async (calls: Call[], step: 'setup' | 'register') => {
      assertActive()
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
    [assertActive, finishBatch, params, saveDraft, update]
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
          update({ readyAt: Date.now(), ready: true })
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
            update({ readyAt: Date.now() + waitMs, ready: false })
            await sleep(Math.max(waitMs, 3000))
            continue
          }
          // The allowance can be spent elsewhere during the wait. It's topped
          // up right before registering, so the wait itself is over.
          if (
            revert?.name === 'ERC20InsufficientAllowance' ||
            revert?.name === 'SafeERC20FailedOperation'
          ) {
            update({ readyAt: Date.now(), ready: true })
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
      if (!draftRef.current) saveDraft({ secret: randomSecret() })
      if (await reconcilePending()) {
        saveDraft(undefined)
        update({ phase: 'done', txStatus: undefined })
        return
      }
      const draft = draftRef.current!
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
        planTxs('register', ['register', 'record'], ['register'])
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
          const symbol = getPaymentToken(params.chainId, params.token)?.symbol
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
        const canBatch = await supportsAtomicBatch(params.chainId)
        update({ batched: canBatch })
        if (canBatch && calls.setup.length > 1) {
          commitHash = await sendBatch(calls.setup, 'setup')
        } else {
          // One at a time. Nothing to batch when the resolver and approval
          // already exist.
          planTxs('setup', calls.setupKinds)
          for (const [i, call] of calls.setup.entries()) {
            commitHash = await send(call, 'setup', calls.setupKinds[i])
          }
        }
        // Already saved when sent one at a time; batches are saved here
        saveDraft({ ...draftRef.current!, commitHash })
      }

      update({ hashes: { commit: draftRef.current?.commitHash } })
      await waitForCommitment(calls.registerWrite)
    } catch (err) {
      if (err instanceof FlowClosedError) return
      update({ error: getErrorMessage(err), txStatus: undefined })
    } finally {
      running.current = false
    }
  }, [
    client,
    finishBatch,
    params,
    planTxs,
    reconcilePending,
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
      if (await reconcilePending()) {
        saveDraft(undefined)
        update({ phase: 'done', txStatus: undefined })
        return
      }
      const draft = draftRef.current
      if (draft?.batch) {
        // An earlier batch's outcome is unknown: check it, never resend
        update({ batched: true, txStatus: 'confirm' })
        const hash = await finishBatch(draft.batch.id)
        if (draft.batch.step === 'setup') {
          saveDraft({ ...draftRef.current!, commitHash: hash })
          throw new Error('Your commitment landed. Wait for it, then register')
        }
        saveDraft(undefined)
        update({
          phase: 'done',
          txStatus: undefined,
          hashes: { commit: draft.commitHash, register: hash },
        })
        return
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
        if (await supportsAtomicBatch(params.chainId)) {
          // Approve if still needed, register, and set the record, all in
          // one confirmation
          registerHash = await sendBatch(
            [...(calls.approve ? [calls.approve] : []), ...calls.register],
            'register'
          )
        } else {
          update({ batched: false })
          planTxs('register', [
            ...(calls.approve ? ['approve' as const] : []),
            'register',
            'record',
          ])
          if (calls.approve) await send(calls.approve, 'register', 'approve')
          // Saved as soon as it lands, so the record can be retried
          registerHash = await send(registerCall, 'register', 'register')
          update({ needsRecord: true })
          await send(setAddressCall, 'register', 'record')
        }
      } else {
        // Registered earlier, but setting the record didn't finish
        planTxs('register', ['register', 'record'], ['register'])
        await send(setAddressCall, 'register', 'record')
      }

      saveDraft(undefined)
      update({
        phase: 'done',
        txStatus: undefined,
        hashes: { commit: draft.commitHash, register: registerHash },
      })
    } catch (err) {
      if (err instanceof FlowClosedError) return
      update({ error: getErrorMessage(err), txStatus: undefined })
    } finally {
      running.current = false
    }
  }, [
    client,
    finishBatch,
    params,
    planTxs,
    reconcilePending,
    saveDraft,
    send,
    sendBatch,
    update,
  ])

  /**
   * Leave the flow. Progress is forgotten only if nothing has been sent that
   * the saved secret or hashes are needed for.
   */
  const reset = useCallback(() => {
    if (running.current) return
    if (!hasProgress(draftRef.current)) saveDraft(undefined)
    setState({ phase: 'idle', hashes: {}, txs: {} })
  }, [saveDraft])

  return { state, start, register, reset }
}
