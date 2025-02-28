import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { CHAIN_ID } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 

// Helper function to get Etherscan URL based on network
export const getEtherscanUrl = (hash: string, type: 'tx' | 'address', chainId: number | undefined) => {
  const baseUrl = chainId === 1 
    ? 'https://etherscan.io' 
    : 'https://sepolia.etherscan.io';
  
  return `${baseUrl}/${type}/${hash}`;
};