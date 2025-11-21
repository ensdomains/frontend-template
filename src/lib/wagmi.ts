import { publicNode } from 'evm-providers'
import { createConfig, http } from 'wagmi'
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  // linea,
  // lineaSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from 'wagmi/chains'

export const wagmiConfig = createConfig({
  chains: [
    mainnet,
    sepolia,
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    // linea,
    // lineaSepolia,
    optimism,
    optimismSepolia,
  ],
  transports: {
    [mainnet.id]: http(publicNode(mainnet.id)),
    [sepolia.id]: http(publicNode(sepolia.id)),
    [arbitrum.id]: http(publicNode(arbitrum.id)),
    [arbitrumSepolia.id]: http(publicNode(arbitrumSepolia.id)),
    [base.id]: http(publicNode(base.id)),
    [baseSepolia.id]: http(publicNode(baseSepolia.id)),
    // [linea.id]: http(publicNode(linea.id)),
    // [lineaSepolia.id]: http(publicNode(lineaSepolia.id)),
    [optimism.id]: http(publicNode(optimism.id)),
    [optimismSepolia.id]: http(publicNode(optimismSepolia.id)),
  },
})
