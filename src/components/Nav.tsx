import { useEffect, useRef, useState } from 'react'
import { useConnection, useDisconnect } from 'wagmi'
import { cx, style } from 'zyzz'

import { usePrimaryName } from '../hooks/usePrimaryName'
import { ensChains, networkName } from '../lib/chains'
import { shortenAddress } from '../lib/format'
import { useNetwork } from '../lib/network'
import { Link } from '../lib/router'
import { Avatar } from './Avatar'
import { WalletModal } from './WalletModal'
import { LogoMark } from './icons'
import { Button } from './ui'

export function Nav() {
  return (
    <nav {...styles.nav()}>
      <Link href="/" aria-label="Home" {...styles.logo()}>
        <LogoMark size={36} />
        <span {...styles.wordmark()}>ENS Examples</span>
      </Link>
      <div {...styles.actions()}>
        <NetworkToggle />
        <ConnectButton />
      </div>
    </nav>
  )
}

/** Switches the network every example reads from (see lib/network.tsx) */
function NetworkToggle() {
  const { chainId, setChainId } = useNetwork()

  return (
    <div role="radiogroup" aria-label="Network" {...styles.toggle()}>
      {ensChains.map((chain) => (
        <button
          key={chain.id}
          type="button"
          role="radio"
          aria-checked={chain.id === chainId}
          onClick={() => setChainId(chain.id)}
          {...cx(
            styles.toggleOption(),
            chain.id === chainId && styles.toggleActive()
          )}
        >
          {networkName(chain.id)}
        </button>
      ))}
    </div>
  )
}

function ConnectButton() {
  const { address, isConnected } = useConnection()
  const { mutate: disconnect } = useDisconnect()
  const { chainId } = useNetwork()
  const { data: name } = usePrimaryName(address)
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [menuOpen])

  if (!isConnected || !address) {
    return (
      <>
        <div {...styles.connect()}>
          <Button size="small" onClick={() => setModalOpen(true)}>
            Connect
          </Button>
        </div>
        <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    )
  }

  return (
    <div ref={menuRef} {...styles.profileWrapper()}>
      <button
        type="button"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        {...styles.profile()}
      >
        <Avatar name={name} chainId={chainId} size={32} />
        <span {...styles.profileName()}>{name ?? shortenAddress(address)}</span>
      </button>

      {menuOpen && (
        <div role="menu" {...styles.menu()}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              navigator.clipboard.writeText(address)
              setMenuOpen(false)
            }}
            {...styles.menuItem()}
          >
            Copy address
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              disconnect()
              setMenuOpen(false)
            }}
            {...styles.menuItem()}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

namespace styles {
  export const nav = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
    width: '100%',
    maxWidth: '64rem',
  })

  export const logo = style({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  })

  export const wordmark = style({
    color: 'var(--text)',
    fontSize: '1.375rem',
    fontWeight: 500,
    letterSpacing: '-0.03em',
    '@media (max-width: 639px)': { display: 'none' },
  })

  export const actions = style({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: 0,
  })

  export const toggle = style({
    display: 'flex',
    height: '2.5rem',
    padding: '0.25rem',
    border: '1px solid var(--border)',
    borderRadius: '0.75rem',
    backgroundColor: 'var(--surface)',
  })

  export const toggleOption = style({
    padding: '0 0.75rem',
    border: 'none',
    borderRadius: '0.5rem',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    ':hover': { color: 'var(--text)' },
    ':focus-visible': { outline: '2px solid var(--blue)' },
  })

  export const toggleActive = style({
    backgroundColor: 'var(--blue-light)',
    color: 'var(--blue)',
    ':hover': { color: 'var(--blue)' },
  })

  export const connect = style({ width: '7rem' })

  export const profileWrapper = style({
    position: 'relative',
    display: 'flex',
    minWidth: 0,
  })

  export const profile = style({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    height: '2.5rem',
    maxWidth: '13rem',
    padding: '0.25rem 1rem 0.25rem 0.25rem',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    backgroundColor: 'var(--surface)',
    fontWeight: 500,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '150ms',
    ':hover': { transform: 'translateY(-1px)' },
  })

  export const profileName = style({
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9375rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })

  export const menu = style({
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '100%',
    padding: '0.375rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--surface)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
  })

  export const menuItem = style({
    padding: '0.625rem 0.75rem',
    border: 'none',
    borderRadius: '0.625rem',
    backgroundColor: 'transparent',
    fontWeight: 500,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    ':hover': { backgroundColor: 'var(--surface-secondary)' },
  })
}
