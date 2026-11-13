import { useState } from 'react'
import { renderSVG } from 'uqr'
import { type Connector, useConnect, useConnectors } from 'wagmi'
import { style } from 'zyzz'

import { Dialog } from './Dialog'
import { Button, Notice, Spinner } from './ui'

/**
 * Picks which connectors to show. EIP-6963 wallets announce themselves, so
 * the generic "Injected" connector is only shown when none do.
 */
function useWalletOptions() {
  const connectors = useConnectors()
  const announced = connectors.filter((c) => c.type === 'injected' && c.icon)
  const hasInjected = typeof window !== 'undefined' && !!window.ethereum

  return connectors.filter((connector) => {
    if (connector.id === 'injected') {
      return announced.length === 0 && hasInjected
    }
    return true
  })
}

export function WalletModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const options = useWalletOptions()
  const { mutate: connect, isPending, variables, reset, error } = useConnect()
  const [uri, setUri] = useState<string>()
  const [copied, setCopied] = useState(false)

  // Start fresh each time it opens (adjusting state during render, not in an
  // effect: https://react.dev/learn/you-might-not-need-an-effect)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) {
      setUri(undefined)
      setCopied(false)
    }
  }

  function close() {
    reset() // Clears a previous attempt's error
    onClose()
  }

  function handleConnect(connector: Connector) {
    if (connector.type === 'walletConnect') {
      const onMessage = ({ type, data }: { type: string; data?: unknown }) => {
        if (type === 'display_uri') setUri(data as string)
      }
      connector.emitter.on('message', onMessage)
      connect(
        { connector },
        {
          onSettled: () => connector.emitter.off('message', onMessage),
          onSuccess: onClose,
          onError: () => setUri(undefined),
        }
      )
      return
    }

    connect({ connector }, { onSuccess: onClose })
  }

  const pendingId = isPending ? variables?.connector : undefined

  return (
    <Dialog
      open={open}
      onClose={close}
      title={uri ? 'Scan with your wallet' : 'Connect a wallet'}
    >
      {uri ? (
        <div {...styles.qrWrapper()}>
          <div
            {...styles.qr()}
            dangerouslySetInnerHTML={{
              __html: renderSVG(uri, { border: 1, pixelSize: 6 }),
            }}
          />
          <Button
            tone="secondary"
            size="small"
            onClick={() => {
              navigator.clipboard.writeText(uri)
              setCopied(true)
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button tone="ghost" size="small" onClick={() => setUri(undefined)}>
            Back
          </Button>
        </div>
      ) : (
        <div {...styles.list()}>
          {options.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => handleConnect(connector)}
              disabled={isPending}
              {...styles.option()}
            >
              <WalletIcon connector={connector} />
              <span {...styles.optionName()}>
                {connector.type === 'walletConnect'
                  ? 'WalletConnect'
                  : connector.id === 'injected'
                    ? 'Browser Wallet'
                    : connector.name}
              </span>
              {pendingId &&
                'uid' in pendingId &&
                pendingId.uid === connector.uid && <Spinner />}
            </button>
          ))}
          {options.length === 0 && (
            <Notice>
              No wallet found. Install a browser wallet, or set
              VITE_WALLETCONNECT_PROJECT_ID to enable WalletConnect.
            </Notice>
          )}
          {error && (
            <Notice tone="error">{error.message.split('\n')[0]}</Notice>
          )}
        </div>
      )}
    </Dialog>
  )
}

function WalletIcon({ connector }: { connector: Connector }) {
  if (connector.icon) {
    return <img src={connector.icon} alt="" {...styles.icon()} />
  }

  if (connector.type === 'walletConnect') {
    return (
      <svg viewBox="0 0 40 40" {...styles.icon()}>
        <rect width="40" height="40" rx="10" fill="#3B99FC" />
        <path
          d="M12.3 15.6c4.3-4.2 11.2-4.2 15.4 0l.5.5c.2.2.2.6 0 .8l-1.8 1.7c-.1.1-.3.1-.4 0l-.7-.7c-3-2.9-7.8-2.9-10.8 0l-.8.7c-.1.1-.3.1-.4 0l-1.8-1.7c-.2-.2-.2-.6 0-.8l.8-.5Zm19 3.5 1.6 1.6c.2.2.2.6 0 .8l-7.2 7.1c-.2.2-.6.2-.8 0l-5.1-5c-.1-.1-.1-.1-.2 0l-5.1 5c-.2.2-.6.2-.8 0l-7.2-7.1c-.2-.2-.2-.6 0-.8l1.6-1.6c.2-.2.6-.2.8 0l5.1 5c.1.1.1.1.2 0l5.1-5c.2-.2.6-.2.8 0l5.1 5c.1.1.1.1.2 0l5.1-5c.3-.2.6-.2.8 0Z"
          fill="white"
        />
      </svg>
    )
  }

  return <span {...styles.iconFallback()} />
}

declare global {
  interface Window {
    ethereum?: unknown
  }
}

namespace styles {
  export const list = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  })

  export const option = style({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--surface)',
    fontWeight: 500,
    fontSize: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '150ms',
    ':hover': {
      backgroundColor: 'var(--surface-secondary)',
      borderColor: '#d6d6d6',
    },
    ':disabled': { cursor: 'wait' },
  })

  export const optionName = style({ flex: 1 })

  export const icon = style({
    width: '2rem',
    height: '2rem',
    borderRadius: '0.5rem',
  })

  export const iconFallback = style({
    width: '2rem',
    height: '2rem',
    borderRadius: '0.5rem',
    backgroundColor: 'var(--blue-light)',
  })

  export const qrWrapper = style({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  })

  export const qr = style({
    width: '100%',
    maxWidth: '18rem',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    lineHeight: 0,
    '& svg': { width: '100%', height: 'auto' },
  })
}
