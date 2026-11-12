import { useConnection, useSwitchChain } from 'wagmi'

import { useNetwork } from '../lib/network'

/**
 * Wallet state relative to the network selected in the nav. Write flows use
 * it to ask the wallet to switch before sending anything, so a transaction is
 * never sent on a different chain than the one the user is looking at.
 */
export function useWalletOnNetwork() {
  const { chainId, name } = useNetwork()
  const { address, chainId: walletChainId, isConnected } = useConnection()
  const {
    mutate: switchChain,
    isPending: isSwitching,
    error,
  } = useSwitchChain()

  return {
    address,
    isConnected,
    isOnNetwork: isConnected && walletChainId === chainId,
    networkName: name,
    switchToNetwork: () => switchChain({ chainId }),
    isSwitching,
    switchError: error,
  }
}
