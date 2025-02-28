
import { mainnet, sepolia } from 'viem/chains';
import { createPublicClient, http } from 'viem';
import { Chain } from 'viem/chains';

import { NETWORK_TYPE, NETWORK, RPC_URL, CHAIN_ID } from '@/lib/constants';

export const CHAINS: Record<NETWORK_TYPE['chainId'], Chain> = {
  [NETWORK.MAINNET['chainId']]: mainnet,
  [NETWORK.SEPOLIA['chainId']]: sepolia,  
};

const client = createPublicClient({
  chain: CHAINS[CHAIN_ID],
  transport: http(RPC_URL),
});


export default client;
