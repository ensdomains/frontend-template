import { useState } from 'react'
import {
  type Address,
  type Chain,
  type Hex,
  isAddress,
  zeroAddress,
} from 'viem'
import { useEnsAvatar } from 'wagmi'
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from 'wagmi/chains'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEnsNameOptimistic } from '@/hooks/useEnsNameOptimistic'
import { cn, truncateAddress } from '@/lib/utils'

const l1Chains = [mainnet, sepolia]
const mainnetChains = [mainnet, base, arbitrum, optimism]
const testnetChains = [sepolia, baseSepolia, arbitrumSepolia, optimismSepolia]

export function ProfileScreen() {
  const [address, setAddress] = useState<string | undefined>()

  return (
    <Layout className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>ENS Profile</CardTitle>
          <CardDescription>
            Enter an address to see the primary name on different chains. This
            is an optimistic version of{' '}
            <a
              target="_blank"
              href="https://primary.ens.domains/"
              className="hover:text-foreground/80 underline"
            >
              primary.ens.domains
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="0x1234..."
            name="address"
            onChange={(e) => setAddress(e.target.value.trim())}
          />

          {isAddress(address as Hex) && (
            <Tabs defaultValue={l1Chains[0].name}>
              <TabsList className="w-full">
                {l1Chains.map((chain) => (
                  <TabsTrigger key={chain.id} value={chain.name}>
                    {chain.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent
                value="Ethereum"
                className="flex w-full flex-col gap-3"
              >
                {mainnetChains.map((chain) => (
                  <Row
                    key={chain.id}
                    l1Chain={mainnet}
                    l2Chain={chain}
                    address={address as Address}
                  />
                ))}
              </TabsContent>

              <TabsContent
                value="Sepolia"
                className="flex w-full flex-col gap-3"
              >
                {testnetChains.map((chain) => (
                  <Row
                    key={chain.id}
                    l1Chain={sepolia}
                    l2Chain={chain}
                    address={address as Address}
                  />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <GitHubFooter href="https://github.com/ensdomains/frontend-template/blob/main/src/screens/Profile.tsx" />
    </Layout>
  )
}

function Row({
  l1Chain,
  l2Chain,
  address,
}: {
  l1Chain: Chain
  l2Chain: Chain
  address: Address
}) {
  const { data: name, isLoading } = useEnsNameOptimistic({
    address,
    l1ChainId: l1Chain.id as (typeof l1Chains)[number]['id'],
    l2ChainId: l2Chain.id,
  })

  return (
    <div className="flex items-center justify-between gap-4">
      <span>{l2Chain.name}</span>
      <Profile name={name} address={address} isLoading={isLoading} />
    </div>
  )
}

function Profile({
  name,
  address,
  isLoading,
}: {
  name?: string | null
  address?: Address | null
  isLoading: boolean
}) {
  const { data: avatar } = useEnsAvatar({ name: name ?? undefined, chainId: 1 })
  const fallbackAvatar = '/img/fallback-avatar.svg'

  return (
    <div className="border-grey-light flex w-fit min-w-fit items-center justify-center rounded-full border bg-white p-1 pr-6 shadow-sm dark:bg-black">
      <div className="flex items-center gap-2">
        <figure className="border-grey-light h-10 w-10 overflow-hidden rounded-full border bg-gray-100">
          <img
            src={isLoading ? fallbackAvatar : avatar || fallbackAvatar}
            alt="ENS Avatar"
            className="h-full w-full object-cover"
            onError={(e) => {
              if (e.currentTarget.src !== fallbackAvatar) {
                e.currentTarget.src = fallbackAvatar
              }
            }}
          />
        </figure>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="font-semibold">
            {isLoading ? 'Loading...' : name || 'No name'}
          </span>

          <span className={cn('text-grey text-xs')}>
            {truncateAddress(address || zeroAddress)}
          </span>
        </div>
      </div>
    </div>
  )
}
