import { useState } from 'react'
import { type Address, zeroAddress } from 'viem'
import { useAccount, useEnsAvatar } from 'wagmi'
import { arbitrum, base, linea, mainnet, optimism } from 'wagmi/chains'

import { ConnectButton } from '@/components/ConnectButton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Layout } from '@/components/ui/layout'
import { GitHubFooter } from '@/components/ui/link'
import { useEnsNameOptimistic } from '@/hooks/useEnsNameOptimistic'
import { cn, truncateAddress } from '@/lib/utils'

export function ProfileScreen() {
  const { address, isConnected } = useAccount()
  const [l1ChainId] = useState(mainnet.id)

  const { data: name } = useEnsNameOptimistic({
    address,
    l1ChainId,
    l2ChainId: l1ChainId,
  })
  const { data: defaultName } = useEnsNameOptimistic({
    address,
    l1ChainId,
    l2ChainId: 0,
  })
  const { data: baseName } = useEnsNameOptimistic({
    address,
    l1ChainId,
    l2ChainId: base.id,
  })
  const { data: arbName } = useEnsNameOptimistic({
    address,
    l1ChainId,
    l2ChainId: arbitrum.id,
  })
  const { data: opName } = useEnsNameOptimistic({
    address,
    l1ChainId,
    l2ChainId: optimism.id,
  })
  const { data: lineaName } = useEnsNameOptimistic({
    address,
    l1ChainId,
    l2ChainId: linea.id,
  })

  const names = new Map([
    ['Default', defaultName],
    ['Ethereum', name],
    ['Base', baseName],
    ['Arbitrum', arbName],
    ['Optimism', opName],
    ['Linea', lineaName],
  ])

  return (
    <Layout className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>ENS Profile</CardTitle>
          <CardDescription>
            Connect your wallet to see your ENS profile on different chains.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isConnected ? (
            <div className="flex w-full flex-col gap-3">
              {Array.from(names.entries()).map(([chain, name]) => (
                <div
                  key={chain}
                  className="flex items-center justify-between gap-4"
                >
                  <span>{chain}</span>
                  <Profile name={name} address={address} />
                </div>
              ))}
            </div>
          ) : (
            <ConnectButton />
          )}
        </CardContent>
      </Card>

      <GitHubFooter href="https://github.com/ensdomains/frontend-template/blob/main/src/screens/Input.tsx" />
    </Layout>
  )
}

function Profile({
  name,
  address,
}: {
  name?: string | null
  address?: Address | null
}) {
  const { data: avatar } = useEnsAvatar({ name: name ?? undefined, chainId: 1 })
  const fallbackAvatar = '/img/fallback-avatar.svg'

  return (
    <div className="border-grey-light flex w-fit min-w-fit items-center justify-center rounded-full border bg-white p-1 pr-6 shadow-sm dark:bg-black">
      <div className="flex items-center gap-2">
        <figure className="border-grey-light h-10 w-10 overflow-hidden rounded-full border bg-gray-100">
          <img
            src={avatar || fallbackAvatar}
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
          <span className="font-semibold">{name || 'No name'}</span>

          <span className={cn('text-grey text-xs')}>
            {truncateAddress(address || zeroAddress)}
          </span>
        </div>
      </div>
    </div>
  )
}
