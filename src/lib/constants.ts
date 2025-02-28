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

export const STEP_LABELS = [
  'Check Name',
  'Commit',
  'Wait',
  'Register',
  'Success'
];

export const ENS_FACTS = [
  "ENS domains work as both a cryptocurrency address and a website URL.",
  "ENS stands for Ethereum Name Service and was launched in 2017.",
  "You can link your ENS domain to social media profiles and personal information.",
  "ENS domains can be used as your identity across Web3 applications.",
  "ENS is the most widely integrated blockchain naming standard.",
  "Over 2.8 million ENS names have been registered so far.",
  "ENS domains can point to content on IPFS for decentralized websites.",
  "You can create subdomains of your ENS domain for different purposes.",
  "ENS is governed by a DAO (Decentralized Autonomous Organization).",
  "The ENS token allows holders to vote on protocol changes.",
  "ENS domains can resolve to any cryptocurrency address, not just Ethereum.",
  "ENS is built on smart contracts that run on the Ethereum blockchain."
];