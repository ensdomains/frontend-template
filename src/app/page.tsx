'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState } from 'react'
import { encodePacked, keccak256 } from 'viem'
import { useSignMessage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

import { convertEVMChainIdToCoinType } from '@/utils'

export default function Home() {
  const { signMessageAsync } = useSignMessage()

  const [expiry, setExpiry] = useState(0)
  const [signature, setSignature] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get('name') as string
    const address = formData.get('address') as `0x${string}`
    const sigExpiry = Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now

    const contents = encodePacked(
      ['address', 'bytes', 'string', 'address', 'uint256', 'uint256'],
      [
        '0xa12159e5131b1eEf6B4857EEE3e1954744b5033A', // base sepolia reverse resolver
        '0x7f87032e', // selector of setNameForAddrWithSignature()
        name, // name we're setting as the reverse record
        address, // address of the account we're setting the reverse record for
        BigInt(sigExpiry), // signature expiry
        BigInt(convertEVMChainIdToCoinType(baseSepolia.id)), // coinType of the chain (has to match forward resolution)
      ]
    )

    const signature = await signMessageAsync({
      message: { raw: keccak256(contents) },
    })

    setSignature(signature)
    setExpiry(sigExpiry)
  }

  return (
    <>
      <ConnectButton />

      <form onSubmit={handleSubmit} style={{ margin: '1rem 0' }}>
        <div>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            name="name"
            id="name"
            placeholder="gregskril.eth"
          />
        </div>

        <div>
          <label htmlFor="address">Address</label>
          <input
            type="text"
            name="address"
            id="address"
            placeholder="0x179A..."
          />
        </div>

        <button type="submit">Sign Message</button>
      </form>

      <div>
        <label>Signature</label>
        <input type="text" disabled value={signature || ''} />
      </div>

      <div>
        <label>Expiry</label>
        <input type="text" disabled value={expiry || ''} />
      </div>
    </>
  )
}
