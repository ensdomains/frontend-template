import { useState } from 'react'
import { style } from 'zyzz'

import { Avatar } from '../components/Avatar'
import { Page } from '../components/Page'
import { Card, Input, Notice, Row, Spinner } from '../components/ui'
import { useDebounce } from '../hooks/useDebounce'
import { parseName, useProfile } from '../hooks/useProfile'
import { useNetwork } from '../lib/network'

export function ProfileScreen() {
  const { chainId } = useNetwork()
  const [input, setInput] = useState('')
  const debounced = useDebounce(input)
  const { name, error } = parseName(debounced)
  const profile = useProfile(name)
  const records = profile.data
  const isEmpty =
    records &&
    !records.texts.length &&
    !records.coins.length &&
    !records.contentHash

  return (
    <Page
      title="Profile records"
      description="Show the records of any ENS name: onchain, offchain, or on an L2. ENSjs batches every record into one Universal Resolver call."
      source="src/hooks/useProfile.ts"
    >
      <Card>
        <Input
          label="ENS name"
          placeholder="ens.eth"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          suffix={profile.isFetching ? <Spinner /> : undefined}
          error={error}
        />

        {profile.error && (
          <Notice tone="error">
            Couldn't resolve {name}. It may not exist or have no resolver.
          </Notice>
        )}

        {name && records && (
          <>
            <div {...styles.header()}>
              <Avatar name={name} chainId={chainId} size={64} />
              <span {...styles.name()}>{name}</span>
            </div>

            {isEmpty && <Notice>This name has no records set.</Notice>}

            <div>
              {records.coins.map((coin) => (
                <Row key={coin.coinType} label={coin.symbol.toUpperCase()}>
                  {coin.value}
                </Row>
              ))}
              {records.texts.map((text) => (
                <Row key={text.key} label={text.key}>
                  <TextValue recordKey={text.key} value={text.value} />
                </Row>
              ))}
              {records.contentHash && (
                <Row label="Content hash">
                  {records.contentHash.protocolType}://
                  {records.contentHash.decoded}
                </Row>
              )}
              <Row label="Resolver">{records.resolverAddress}</Row>
            </div>
          </>
        )}
      </Card>
    </Page>
  )
}

/**
 * Records are arbitrary user input. Render them as text, and only link to
 * values that are plain https URLs (never `javascript:` or other schemes).
 */
function TextValue({ recordKey, value }: { recordKey: string; value: string }) {
  if (recordKey === 'url' && isHttpsUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer nofollow"
        {...styles.link()}
      >
        {value}
      </a>
    )
  }
  return <>{value}</>
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

namespace styles {
  export const header = style({
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  })

  export const name = style({
    fontFamily: 'var(--font-mono)',
    fontSize: '1.5rem',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    overflowWrap: 'anywhere',
  })

  export const link = style({
    color: 'var(--blue)',
    textDecoration: 'underline',
  })
}
