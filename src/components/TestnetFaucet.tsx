import { useState } from 'react'
import { encodeFunctionData, parseAbi, parseUnits } from 'viem'
import { sendTransaction, waitForTransactionReceipt } from 'wagmi/actions'
import { style } from 'zyzz'

import { useEnsClient } from '../hooks/useEnsClient'
import { useWalletOnNetwork } from '../hooks/useWalletOnNetwork'
import { sepolia } from '../lib/chains'
import {
  PAYMENT_TOKENS,
  type PaymentToken,
  getErrorMessage,
  getPaymentTokenAddress,
} from '../lib/registration'
import { config } from '../lib/wagmi'
import { Spinner } from './ui'

const mintAbi = parseAbi(['function mint(address to, uint256 amount)'])

/** Sepolia's mock payment tokens can be minted by anyone, for testing. */
export function TestnetFaucet({ token }: { token: PaymentToken }) {
  const client = useEnsClient(sepolia.id)
  const { address, isOnNetwork } = useWalletOnNetwork()
  const [status, setStatus] = useState<string>()
  const [pending, setPending] = useState(false)
  const { symbol, decimals } = PAYMENT_TOKENS[token]

  if (!address || !isOnNetwork || client.chain.id !== sepolia.id) return null

  async function mint() {
    if (!address) return
    setPending(true)
    setStatus(undefined)
    try {
      const hash = await sendTransaction(config, {
        chainId: sepolia.id,
        account: address,
        to: getPaymentTokenAddress(client, token),
        data: encodeFunctionData({
          abi: mintAbi,
          functionName: 'mint',
          args: [address, parseUnits('100', decimals)],
        }),
      })
      await waitForTransactionReceipt(config, { hash, chainId: sepolia.id })
      setStatus(`Minted 100 test ${symbol}`)
    } catch (err) {
      setStatus(getErrorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={mint}
      disabled={pending}
      {...styles.faucet()}
    >
      {pending && <Spinner size={12} />}
      {status ?? `Testnet: get 100 test ${symbol}`}
    </button>
  )
}

namespace styles {
  export const faucet = style({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    alignSelf: 'center',
    padding: '0.25rem 0.5rem',
    border: 'none',
    background: 'none',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    ':hover': { color: 'var(--blue)' },
  })
}
