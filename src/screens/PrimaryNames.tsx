import { useState } from 'react'
import type { Address } from 'viem'
import { style } from 'zyzz'

import { Avatar } from '../components/Avatar'
import { Page } from '../components/Page'
import { Card, Input, Row, Spinner } from '../components/ui'
import { useAddressOrName } from '../hooks/useAddressOrName'
import { useEnsNameOptimistic } from '../hooks/useEnsNameOptimistic'
import { type allChains, getEnsChain, l2Chains } from '../lib/chains'
import { useNetwork } from '../lib/network'

export function PrimaryNamesScreen() {
  const { chainId } = useNetwork()
  const [input, setInput] = useState('')
  const { result, isLoading, error } = useAddressOrName(input)
  const chains = [getEnsChain(chainId), ...l2Chains[chainId]]

  return (
    <Page
      title="Primary names"
      description={
        <>
          An address can have a different primary name on each chain. This reads
          L2 reverse registrars directly, so new names show up instantly instead
          of after the usual propagation delay. It's an optimistic version of{' '}
          <a
            href="https://primary.ens.domains"
            target="_blank"
            rel="noopener noreferrer"
          >
            primary.ens.domains
          </a>
          .
        </>
      }
      source="src/hooks/useEnsNameOptimistic.ts"
    >
      <Card>
        <Input
          label="Address or ENS name"
          placeholder="0x… or nick.eth"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          suffix={isLoading ? <Spinner /> : undefined}
          error={error}
        />

        {result && (
          <div>
            {chains.map((chain) => (
              <ChainRow key={chain.id} chain={chain} address={result.address} />
            ))}
          </div>
        )}
      </Card>
    </Page>
  )
}

function ChainRow({
  chain,
  address,
}: {
  chain: (typeof allChains)[number]
  address: Address
}) {
  const { chainId } = useNetwork()
  const {
    data: name,
    isLoading,
    isError,
  } = useEnsNameOptimistic({
    address,
    l1ChainId: chainId,
    l2ChainId: chain.id,
  })

  return (
    <Row label={chain.name}>
      <span {...styles.value()}>
        {isLoading ? (
          <Spinner />
        ) : name ? (
          <>
            <Avatar name={name} chainId={chainId} size={24} />
            {name}
          </>
        ) : (
          <span {...styles.empty()}>{isError ? 'Unavailable' : 'No name'}</span>
        )}
      </span>
    </Row>
  )
}

namespace styles {
  export const value = style({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  })

  export const empty = style({
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font)',
  })
}
