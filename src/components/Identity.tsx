import type { Address } from 'viem'
import { style } from 'zyzz'

import { usePrimaryName } from '../hooks/usePrimaryName'
import { shortenAddress } from '../lib/format'
import { useNetwork } from '../lib/network'
import { Avatar } from './Avatar'
import { Spinner } from './ui'

/**
 * Shows an address the way users expect: avatar and primary name when it has
 * one, the shortened address otherwise. Use this anywhere an address is shown.
 *
 * Pass `name` when you already know it (e.g. the user typed it), so it isn't
 * replaced by the address's primary name, which could be a different name.
 */
export function Identity({
  address,
  name: knownName,
  isLoading,
}: {
  address: Address
  name?: string | null
  isLoading?: boolean
}) {
  const { chainId } = useNetwork()
  const primary = usePrimaryName(knownName ? undefined : address)
  const name = knownName ?? primary.data
  const loading = isLoading || (!knownName && primary.isLoading)

  return (
    <span {...styles.chip()} title={address}>
      <Avatar name={name} chainId={chainId} size={32} />
      <span {...styles.text()}>
        <span {...styles.primary()}>
          {loading ? <Spinner size={12} /> : (name ?? shortenAddress(address))}
        </span>
        {name && <span {...styles.secondary()}>{shortenAddress(address)}</span>}
      </span>
    </span>
  )
}

namespace styles {
  export const chip = style({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    maxWidth: '100%',
    padding: '0.25rem 1rem 0.25rem 0.25rem',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    backgroundColor: 'var(--surface)',
  })

  export const text = style({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    lineHeight: 1.15,
  })

  export const primary = style({
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
    fontSize: '0.9375rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })

  export const secondary = style({
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
  })
}
