import { useState } from 'react'
import { style } from 'zyzz'

import { type EnsChainId, sepolia } from '../lib/chains'

/**
 * ENS avatars can be an https URL, IPFS/Arweave URI, data URI, or an NFT
 * (ENSIP-12). The ENS metadata service resolves all of them to an image URL,
 * which is simpler and faster than doing it in the browser. For an in-browser
 * alternative, see wagmi's `useEnsAvatar`.
 */
export function avatarUrl(name: string, chainId: EnsChainId) {
  const network = chainId === sepolia.id ? 'sepolia' : 'mainnet'
  return `https://metadata.ens.domains/${network}/avatar/${encodeURIComponent(name)}`
}

export function Avatar({
  name,
  chainId,
  size = 36,
}: {
  name?: string | null
  chainId: EnsChainId
  size?: number
}) {
  // Falls back to a plain circle when there's no avatar
  const [failed, setFailed] = useState<string>()
  const showImage = name && failed !== name

  return (
    <span {...styles.avatar({ style: { width: size, height: size } })}>
      {showImage && (
        <img
          src={avatarUrl(name, chainId)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(name)}
          {...styles.image()}
        />
      )}
    </span>
  )
}

namespace styles {
  export const avatar = style({
    display: 'inline-flex',
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: '50%',
    // The brand gradient, shown while loading or when there's no avatar
    backgroundImage: 'linear-gradient(135deg, var(--blue-light), var(--blue))',
  })

  export const image = style({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  })
}
