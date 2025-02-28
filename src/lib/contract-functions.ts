import client from "@/lib/client";
import { formatEther } from 'viem';
import { ethRegistrarControllerAbi } from "@/lib/abis/eth-registrar-controller.abi";
import { ETH_REGISTRAR_CONTROLLER_ADDRESS } from "@/lib/constants";

// Check if a name is available
export const checkNameAvailability = async (name: string): Promise<boolean> => {
  try {
    debugger;
    const available = await client.readContract({
      address: ETH_REGISTRAR_CONTROLLER_ADDRESS as `0x${string}`,
      abi: ethRegistrarControllerAbi,
      functionName: "available",
      args: [name],
    });
    
    return Boolean(available);
  } catch (error) {
    console.error('Error checking name availability:', error);
    throw error;
  }
};

export const getRentPrice = async (name: string, duration: number) => {
  try {
    const price = await client.readContract({
      address: ETH_REGISTRAR_CONTROLLER_ADDRESS as `0x${string}`,
      abi: ethRegistrarControllerAbi,
      functionName: "rentPrice",
      args: [name, BigInt(duration)],
    });
    
    const priceObj = price as { base: bigint; premium: bigint };
    
    return {
      base: priceObj.base,
      premium: priceObj.premium,
      total: priceObj.base + priceObj.premium,
      formattedTotal: formatEther(priceObj.base + priceObj.premium)
    };
  } catch (error) {
    console.error('Error getting rent price:', error);
    throw error;
  }
};

// Generate a commitment hash
export const makeCommitmentHash = async (
  name: string,
  owner: string,
  duration: number,
  secret: string,
  resolver: string,
  data: any[],
  reverseRecord: boolean,
  ownerControlledFuses: number
) => {
  try {
    const hash = await client.readContract({
      address: ETH_REGISTRAR_CONTROLLER_ADDRESS as `0x${string}`,
      abi: ethRegistrarControllerAbi,
      functionName: "makeCommitment",
      args: [
        name,
        owner as `0x${string}`,
        BigInt(duration),
        secret as `0x${string}`,
        resolver as `0x${string}`,
        data,
        reverseRecord,
        ownerControlledFuses
      ],
    });
    
    return hash as `0x${string}`;
  } catch (error) {
    console.error('Error making commitment hash:', error);
    throw error;
  }
};
