import type { Hash } from 'viem'
import { waitForCallsStatus, waitForTransactionReceipt } from 'wagmi/actions'

import { config } from './wagmi'

/**
 * Waits for a transaction and returns the hash that actually landed.
 *
 * Wallets let users speed up (reprice), cancel, or replace a pending
 * transaction. viem follows the replacement, so a successful receipt alone
 * doesn't mean *this* call ran: a cancellation also "succeeds". Only a
 * repriced transaction (same call, higher gas) counts.
 */
export async function confirmTransaction(chainId: number, hash: Hash) {
  let replacedReason: string | undefined
  const receipt = await waitForTransactionReceipt(config, {
    chainId: chainId as (typeof config.chains)[number]['id'],
    hash,
    onReplaced: (replacement) => {
      replacedReason = replacement.reason
    },
  })

  if (replacedReason && replacedReason !== 'repriced') {
    throw new Error('The transaction was cancelled or replaced in your wallet')
  }
  if (receipt.status !== 'success') throw new Error('The transaction failed')
  return receipt.transactionHash
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
