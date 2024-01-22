'use client'

import { Button, Card, Input, Spinner } from '@ensdomains/thorin'
import { useState } from 'react'
import { useDebounce } from 'usehooks-ts'
import { isAddress } from 'viem/utils'
import { useEnsAddress } from 'wagmi'

import { Container, Layout } from '@/components/templates'

export default function Page() {
  const [input, setInput] = useState('')
  const debouncedInput = useDebounce(input, 500)

  // Resolve potential ENS names (dot separated strings)
  const { data: ensAddress, isLoading: ensAddressIsLoading } = useEnsAddress({
    name: debouncedInput.includes('.') ? debouncedInput : undefined,
    chainId: 1,
  })

  // Set the address (address if provided directly or resolved address from ENS name)
  const address =
    input !== debouncedInput
      ? undefined
      : isAddress(debouncedInput)
        ? debouncedInput
        : ensAddress

  return (
    <Layout>
      <header />

      <Container as="main">
        <Card title="Name/Address Input">
          <Input
            label="Address or ENS Name"
            placeholder="nick.eth"
            description={ensAddress && address}
            suffix={ensAddressIsLoading && <Spinner />}
            onChange={(e) => setInput(e.target.value)}
          />

          <Button disabled={!address} colorStyle="greenPrimary">
            {!address ? 'No Address' : 'Nice!'}
          </Button>
        </Card>
      </Container>

      <footer />
    </Layout>
  )
}
