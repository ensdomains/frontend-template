import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react'

import {
  type EnsChainId,
  getEnsChain,
  isEnsChainId,
  mainnet,
  networkName,
} from './chains'

/**
 * The network every example reads from, picked with the toggle in the nav.
 * It is app state, separate from the wallet's chain: reads always follow the
 * toggle, and writes ask the wallet to switch to it first (see
 * `useWalletOnNetwork`).
 */
type NetworkContextValue = {
  chainId: EnsChainId
  setChainId: (chainId: EnsChainId) => void
}

const STORAGE_KEY = 'ens-examples:network'

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined)

function readStoredChainId(): EnsChainId {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return isEnsChainId(stored) ? stored : mainnet.id
  } catch {
    // Storage can be unavailable (private mode)
    return mainnet.id
  }
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainIdState] = useState(readStoredChainId)

  const setChainId = useCallback((next: EnsChainId) => {
    setChainIdState(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Not persisted, but the toggle still works for this visit
    }
  }, [])

  return (
    <NetworkContext.Provider value={{ chainId, setChainId }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (!context) throw new Error('useNetwork must be used in NetworkProvider')
  return {
    ...context,
    chain: getEnsChain(context.chainId),
    name: networkName(context.chainId),
  }
}
