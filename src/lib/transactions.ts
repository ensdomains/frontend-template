import { type Hash, TransactionNotFoundError } from 'viem'
import { getTransaction, waitForTransactionReceipt } from 'viem/actions'
import { waitForCallsStatus } from 'wagmi/actions'

import { config } from './wagmi'

/**
 * The transaction definitely didn't do what was sent: it reverted, or was
 * cancelled or replaced. Any other error from `confirmTransaction` (e.g. a
 * timeout or RPC failure) means the outcome isn't known yet.
 */
export class TransactionFailedError extends Error {}

/**
 * Waits for a transaction and returns the hash that actually landed.
 *
 * Wallets let users speed up (reprice), cancel, or replace a pending
 * transaction. viem follows the replacement, so a successful receipt alone
 * doesn't mean *this* call ran: a cancellation also "succeeds". Only a
 * repriced transaction (same call, higher gas) counts.
 *
 * Throws `TransactionFailedError` when it definitely failed. Anything else,
 * including running out of `timeout`, means the outcome isn't known yet.
 */
export async function confirmTransaction(
  chainId: number,
  hash: Hash,
  { timeout }: { timeout?: number } = {}
) {
  let replacedReason: string | undefined
  // viem's action rather than wagmi's, which throws its own error for a
  // reverted receipt instead of returning it
  const receipt = await waitForTransactionReceipt(getClient(chainId), {
    hash,
    timeout,
    onReplaced: (replacement) => {
      replacedReason = replacement.reason
    },
  })

  if (replacedReason && replacedReason !== 'repriced') {
    throw new TransactionFailedError(
      'The transaction was cancelled or replaced in your wallet'
    )
  }
  if (receipt.status !== 'success') {
    throw new TransactionFailedError('The transaction failed')
  }
  return receipt.transactionHash
}

/**
 * Whether the node no longer knows about a transaction (not pending, not
 * mined), e.g. after it was replaced while the page was closed. Its replacement
 * can't be found from the hash alone, so check its effect onchain instead.
 */
export async function isTransactionGone(chainId: number, hash: Hash) {
  try {
    await getTransaction(getClient(chainId), { hash })
    return false
  } catch (err) {
    if (err instanceof TransactionNotFoundError) return true
    throw err
  }
}

function getClient(chainId: number) {
  return config.getClient({
    chainId: chainId as (typeof config.chains)[number]['id'],
  })
}

/** The wallet reported that a batch definitely failed (nothing ran) */
export class BatchFailedError extends Error {
  constructor() {
    super('The wallet batch failed')
  }
}

/**
 * Waits for an EIP-5792 batch and returns the hash of the transaction that
 * included its last call. Throws `BatchFailedError` only when the batch
 * definitely failed; other errors (e.g. a timeout) mean the outcome is still
 * unknown, so callers should keep the batch id and check again later.
 */
export async function confirmBatch(id: string) {
  const result = await waitForCallsStatus(config, { id, timeout: 15 * 60_000 })
  const last = result.receipts?.at(-1)
  if (result.status !== 'success' || !last || last.status !== 'success') {
    throw new BatchFailedError()
  }
  return last.transactionHash
}

/**
 * Whether a wallet's EIP-5792 capabilities for one chain allow an atomic batch
 * right now. Only `supported` counts: `ready` means the wallet would first ask
 * to upgrade the account (EIP-7702), which an app shouldn't trigger as a side
 * effect. Those wallets get one transaction per call instead.
 */
export function isAtomicBatchSupported(capabilities: {
  atomic?: { status?: string }
}) {
  return capabilities.atomic?.status === 'supported'
}
