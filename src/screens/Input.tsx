import { useState } from 'react'

import { Identity } from '../components/Identity'
import { Page } from '../components/Page'
import { Card, Input, Row, Spinner } from '../components/ui'
import { useAddressOrName } from '../hooks/useAddressOrName'

export function InputScreen() {
  const [input, setInput] = useState('')
  const { result, isLoading, error } = useAddressOrName(input)

  return (
    <Page
      title="Name or address input"
      description="Every address input should also accept ENS names. Resolve names to addresses as the user types, and show the primary name for pasted addresses."
      source="src/hooks/useAddressOrName.ts"
    >
      <Card>
        <Input
          label="Address or ENS name"
          placeholder="nick.eth or 0x…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          suffix={isLoading ? <Spinner /> : undefined}
          error={error}
        />

        {result && (
          <div>
            <Row label="Resolves to">
              <Identity address={result.address} name={result.name} />
            </Row>
            <Row label="Address">{result.address}</Row>
          </div>
        )}
      </Card>
    </Page>
  )
}
