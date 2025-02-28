const getAlchemyRpcUrl = (network: 'mainnet' | 'sepolia') => {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) {
    return `https://ethereum-${network}-rpc.publicnode.com`;
  }
  return `https://eth-${network}.g.alchemy.com/v2/${apiKey}`;
};

export const BURN_ADDRESS = '0x0000000000000000000000000000000000000000';

export const ETH_REGISTRAR_CONTROLLER_ADDRESS =
  process.env.NEXT_PUBLIC_ETH_REGISTRAR_CONTROLLER_ADDRESS as `0x${string}` ||
  '0x0000000000000000000000000000000000000000'

export const NETWORK = {
  MAINNET: {
    chainId: 1,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  },
  SEPOLIA: {
    chainId: 11155111,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  },
} as const;

export type NETWORK_TYPE = (typeof NETWORK)[keyof typeof NETWORK];
export type NETWORK_NAME = keyof typeof NETWORK;

export const CHAIN_ID: NETWORK_TYPE['chainId'] =
  (Number(process.env.NEXT_PUBLIC_CHAIN_ID) as NETWORK_TYPE['chainId']) ||
  NETWORK.MAINNET['chainId'];

export const DEFAULT_NETWORK_NAME = (
  Object.entries(NETWORK).find(
    ([, id]) => id.chainId === CHAIN_ID,
  )?.[0] || ''
).toLowerCase() as Lowercase<NETWORK_NAME>;

export const WALLET_CONNECTION_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLET_CONNECTION_PROJECT_ID || '';

export const PRIVATE_WALLET_KEY = (process.env.PRIVATE_WALLET_KEY ||
  '0x...') as `0x${string}`;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
