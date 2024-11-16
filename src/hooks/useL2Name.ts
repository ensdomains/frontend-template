// This is a temporary solution until this functionality is built into web3 libraries
import { useQuery } from '@tanstack/react-query'
import {
  ByteArray,
  Hex,
  bytesToString,
  encodeFunctionData,
  hexToString,
  labelhash,
  namehash,
  parseAbi,
  stringToBytes,
  toHex,
} from 'viem'
import {
  arbitrumSepolia,
  baseSepolia,
  lineaSepolia,
  optimismSepolia,
  scrollSepolia,
  sepolia,
} from 'viem/chains'
import { useChainId, usePublicClient } from 'wagmi'

import { wagmiConfig } from '@/lib/web3'

const l1ChainIds = [sepolia.id] as const

// prettier-ignore
const l2ChainIds = [arbitrumSepolia.id, baseSepolia.id, lineaSepolia.id, optimismSepolia.id, scrollSepolia.id]
type L2ChainId = (typeof l2ChainIds)[number]

const wagmiConfigChainIds = wagmiConfig.chains.map((chain) => chain.id)
type WagmiConfigChainId = (typeof wagmiConfigChainIds)[number]

type Props = {
  address: Hex
  l2ChainId: L2ChainId
}

const evmChainIdToCoinType = (chainId: number) => {
  return (0x80000000 | chainId) >>> 0
}

const getReverseNamespace = (chainId: number) =>
  `${evmChainIdToCoinType(chainId).toString(16)}.reverse`

const getReverseNode = (address: Hex, chainId: number) => {
  const reverseNamespace = getReverseNamespace(chainId)
  return `${address.toLowerCase().slice(2)}.${reverseNamespace}`
}

const getReverseNodeHash = (address: Hex, chainId: number) => {
  const reverseNode = getReverseNode(address, chainId)
  return namehash(reverseNode)
}

export function useL2Name({ address, l2ChainId }: Props) {
  const connectedChainId = useChainId() as WagmiConfigChainId
  const chainId = l2ChainId ?? connectedChainId
  const l1ChainId = sepolia.id

  if (!wagmiConfigChainIds.includes(chainId as any)) {
    throw new Error('Unsupported chain')
  }

  if (!wagmiConfigChainIds.includes(l1ChainId as any)) {
    throw new Error('Add L1 Sepolia to your wagmi config')
  }

  if (l1ChainIds.includes(chainId as any)) {
    throw new Error("Use wagmi's native `useEnsName` hook for L1")
  }

  const l1Client = usePublicClient({
    config: wagmiConfig,
    chainId: l1ChainId,
  })

  return useQuery({
    queryKey: ['l2-name', chainId, address],
    queryFn: async () => {
      if (!l1Client) {
        throw new Error('Missing client')
      }

      const l1ReverseResolver = await l1Client.readContract({
        address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        abi: parseAbi([
          'function resolver(bytes32 node) external view returns (address)',
        ]),
        functionName: 'resolver',
        args: [namehash(getReverseNamespace(chainId))],
      })

      if (l1ReverseResolver === '0x0000000000000000000000000000000000000000') {
        throw new Error('L1 Reverse Resolver not deployed for this chain')
      }

      // Encode the name lookup to be used in the `resolve()` call
      const encodedNameCall = encodeFunctionData({
        abi: parseAbi([
          'function name(bytes32 node) pure returns (string memory)',
        ]),
        functionName: 'name',
        args: [getReverseNodeHash(address, chainId)],
      })

      const reverseName = await l1Client.readContract({
        address: l1ReverseResolver,
        abi: parseAbi(['function resolve(bytes, bytes) view returns (bytes)']),
        functionName: 'resolve',
        args: [
          toHex(packetToBytes(getReverseNode(address, chainId))),
          encodedNameCall,
        ],
      })

      const reverseNameFormatted = hexToString(reverseName)
        .replace(/[\x01-\x20]/g, '')
        .replace(/\0/g, '')

      const forwardAddr = await l1Client.getEnsAddress({
        name: reverseNameFormatted,
        coinType: evmChainIdToCoinType(chainId),
      })

      console.log({
        reverseNameFormatted,
        forwardAddr,
        chainId,
        coinType: evmChainIdToCoinType(chainId),
      })

      if (forwardAddr?.toLowerCase() === address.toLowerCase()) {
        return reverseNameFormatted
      }

      return null
    },
  })
}

function packetToBytes(packet: string): ByteArray {
  // strip leading and trailing `.`
  const value = packet.replace(/^\.|\.$/gm, '')
  if (value.length === 0) return new Uint8Array(1)

  const bytes = new Uint8Array(stringToBytes(value).byteLength + 2)

  let offset = 0
  const list = value.split('.')
  for (let i = 0; i < list.length; i += 1) {
    let encoded = stringToBytes(list[i])
    // if the length is > 255, make the encoded label value a labelhash
    // this is compatible with the universal resolver
    if (encoded.byteLength > 255)
      encoded = stringToBytes(encodeLabelhash(labelhash(list[i])))
    bytes[offset] = encoded.length
    bytes.set(encoded, offset + 1)
    offset += encoded.length + 1
  }

  if (bytes.byteLength !== offset + 1) return bytes.slice(0, offset + 1)

  return bytes
}

function bytesToPacket(bytes: ByteArray): string {
  let offset = 0
  let result = ''

  while (offset < bytes.length) {
    const len = bytes[offset]
    if (len === 0) {
      offset += 1
      break
    }

    result += `${bytesToString(bytes.subarray(offset + 1, offset + len + 1))}.`
    offset += len + 1
  }

  return result.replace(/\.$/, '')
}

function encodeLabelhash(hash: string) {
  if (!hash.startsWith('0x'))
    throw new Error('Expected labelhash to start with 0x')

  if (hash.length !== 66)
    throw new Error('Expected labelhash to have a length of 66')

  return `[${hash.slice(2)}]`
}
