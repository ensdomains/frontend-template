import { useState } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { isAddress } from 'viem'
import { useEnsAddress } from 'wagmi'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Layout } from '@/components/ui/layout'
import { GitHubFooter } from '@/components/ui/link'

export function InputScreen() {
  const [input, setInput] = useState('')
  const [debouncedInput] = useDebounceValue(input, 500)

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
    <Layout className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Name/Address Input</CardTitle>
          <CardDescription>
            Every address input should also accept ENS names.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            label="Address or ENS name"
            placeholder="nick.eth"
            onChange={(e) => setInput(e.target.value)}
            loading={ensAddressIsLoading}
          />

          {address && <span className="text-sm text-green-600">{address}</span>}
        </CardContent>
      </Card>

      <GitHubFooter href="https://github.com/ensdomains/frontend-template/blob/main/src/screens/Input.tsx" />
    </Layout>
  )
}
