import { useState } from 'react'
import { encodeFunctionData, parseAbi, parseUnits } from 'viem'
import { sendTransaction } from 'wagmi/actions'
import { style } from 'zyzz'

import { useEnsClient } from '../hooks/useEnsClient'
import { useWalletOnNetwork } from '../hooks/useWalletOnNetwork'
import { sepolia } from '../lib/chains'
import {
  type PaymentTokenInfo,
  getErrorMessage,
  getPaymentTokenAddress,
} from '../lib/registration'
import { confirmTransaction } from '../lib/transactions'
import { config } from '../lib/wagmi'
import { Spinner } from './ui'

const mintAbi = parseAbi(['function mint(address to, uint256 amount)'])

/**
 * How to get the selected Sepolia payment token: a mint button for tokens
 * anyone can mint (ENS's mock stablecoin), or a link to an external faucet
 * (Circle's USDC).
 */
export function TestnetFaucet({ token }: { token: PaymentTokenInfo }) {
  if (token.mintable) return <MintButton key={token.id} token={token} />
  if (!token.faucetUrl) return null
  return (
    <a
      href={token.faucetUrl}
      target="_blank"
      rel="noopener noreferrer"
      {...styles.faucet()}
    >
      Get test {token.symbol} from the faucet ↗
    </a>
  )
}

function MintButton({ token }: { token: PaymentTokenInfo }) {
  const client = useEnsClient(sepolia.id)
  const { address, isOnNetwork } = useWalletOnNetwork()
  const [status, setStatus] = useState<string>()
  const [pending, setPending] = useState(false)

  const canMint = !!address && isOnNetwork && client.chain.id === sepolia.id
  // Same footprint as the faucet link, so switching tokens doesn't shift
  if (!canMint) {
    return (
      <span {...styles.faucet()} data-disabled="">
        Connect a wallet on Sepolia to mint {token.symbol}
      </span>
    )
  }

  async function mint() {
    if (!address) return
    setPending(true)
    setStatus(undefined)
    try {
      const hash = await sendTransaction(config, {
        chainId: sepolia.id,
        account: address,
        to: getPaymentTokenAddress(client, token.id),
        data: encodeFunctionData({
          abi: mintAbi,
          functionName: 'mint',
          args: [address, parseUnits('100', token.decimals)],
        }),
      })
      await confirmTransaction(sepolia.id, hash)
      setStatus(`Minted 100 ${token.symbol}`)
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
      {status ?? `Mint 100 ${token.symbol}`}
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
    textDecoration: 'none',
    cursor: 'pointer',
    ':hover': { color: 'var(--blue)' },
    '&[data-disabled]': { color: 'var(--text-tertiary)', cursor: 'default' },
  })
}
