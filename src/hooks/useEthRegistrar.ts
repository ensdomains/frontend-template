import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { 
  checkNameAvailability, 
  getRentPrice,
  makeCommitmentHash 
} from '@/lib/contract-functions';
import { ETH_REGISTRAR_CONTROLLER_ADDRESS, BURN_ADDRESS } from '@/lib/constants';
import { ethRegistrarControllerAbi } from '@/lib/abis/eth-registrar-controller.abi';

// Registration steps
export enum RegistrationStep {
  InputName,
  CheckingAvailability,
  MakeCommitment,
  WaitForCommitment,
  Register,
  Success
}

// Local storage keys
const COMMITMENT_KEY = 'ens_commitment';
const SECRET_KEY = 'ens_secret';
const NAME_KEY = 'ens_name';
const COMMIT_TIMESTAMP_KEY = 'ens_commit_timestamp';
const RENT_PRICE_KEY = 'ens_rent_price';
const DURATION_KEY = 'ens_duration';

export function useEthRegistrar() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(31536000); // 1 year in seconds
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(RegistrationStep.InputName);
  const [secret, setSecret] = useState<string>('');
  const [commitment, setCommitment] = useState<string>('');
  const [commitTimestamp, setCommitTimestamp] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [rentPriceWei, setRentPriceWei] = useState<bigint>(BigInt(0));
  const [commitTxHash, setCommitTxHash] = useState<string>('');
  const [registerTxHash, setRegisterTxHash] = useState<string>('');

  const generateSecret = (): string => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const loadSavedData = () => {
    const savedCommitment = localStorage.getItem(COMMITMENT_KEY);
    const savedSecret = localStorage.getItem(SECRET_KEY);
    const savedName = localStorage.getItem(NAME_KEY);
    const savedTimestamp = localStorage.getItem(COMMIT_TIMESTAMP_KEY);
    const savedRentPrice = localStorage.getItem(RENT_PRICE_KEY);
    const savedDuration = localStorage.getItem(DURATION_KEY);
    const savedCommitTxHash = localStorage.getItem('ens_commit_tx_hash');
    const savedRegisterTxHash = localStorage.getItem('ens_register_tx_hash');

    if (savedCommitment && savedSecret && savedName && savedTimestamp) {
      setCommitment(savedCommitment);
      setSecret(savedSecret);
      setName(savedName);
      setCommitTimestamp(parseInt(savedTimestamp));
      if (savedRentPrice) setRentPriceWei(BigInt(savedRentPrice));
      if (savedDuration) setDuration(parseInt(savedDuration));
      
      const now = Date.now();
      const commitTime = parseInt(savedTimestamp);
      if (now - commitTime < 24 * 60 * 60 * 1000) {
        if (now - commitTime >= 60 * 1000) {
          setCurrentStep(RegistrationStep.Register);
        } else {
          setCurrentStep(RegistrationStep.WaitForCommitment);
          startTimer(commitTime);
        }
      }
    }

    if (savedCommitTxHash) setCommitTxHash(savedCommitTxHash);
    if (savedRegisterTxHash) setRegisterTxHash(savedRegisterTxHash);
  };

  const startTimer = (startTimestamp: number) => {
    const now = Date.now();
    const elapsedTime = now - startTimestamp;
    
    if (elapsedTime >= 60 * 1000) {
      setCurrentStep(RegistrationStep.Register);
    } else {
      setRemainingTime(60 - Math.floor(elapsedTime / 1000));
      
      const timer = setInterval(() => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTimestamp;
        
        if (elapsed >= 60 * 1000) {
          setCurrentStep(RegistrationStep.Register);
          clearInterval(timer);
        } else {
          setRemainingTime(60 - Math.floor(elapsed / 1000));
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  };

  const checkAvailability = async () => {
    if (!name) {
      setError('Please enter a name');
      return;
    }

    setIsLoading(true);
    setError('');
    setCurrentStep(RegistrationStep.CheckingAvailability);

    try {
      const available = await checkNameAvailability(name);
      setIsAvailable(available);

      if (!available) {
        setError(`${name}.eth is not available`);
        setCurrentStep(RegistrationStep.InputName);
      } else {
        const price = await getRentPrice(name, duration);
        const priceWithBuffer = (price.base + price.premium) * 110n / 100n;
        setRentPriceWei(priceWithBuffer);
        
        setCurrentStep(RegistrationStep.MakeCommitment);
      }
    } catch (err) {
      console.error(err);
      setError('Error checking availability');
      setCurrentStep(RegistrationStep.InputName);
    } finally {
      setIsLoading(false);
    }
  };

  const makeCommitment = async () => {
    if (!name || !isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const newSecret = generateSecret();
      setSecret(newSecret);

      const commitmentHash = await makeCommitmentHash(
        name,
        address,
        duration,
        newSecret,
        BURN_ADDRESS,
        [],
        false,
        0
      );
      
      setCommitment(commitmentHash);

      if (walletClient) {
        const hash = await walletClient.writeContract({
          address: ETH_REGISTRAR_CONTROLLER_ADDRESS as `0x${string}`,
          abi: ethRegistrarControllerAbi,
          functionName: 'commit',
          args: [commitmentHash],
        });

        console.log('Commitment transaction hash:', hash);
        
        const timestamp = Date.now();
        localStorage.setItem(COMMITMENT_KEY, commitmentHash);
        localStorage.setItem(SECRET_KEY, newSecret);
        localStorage.setItem(NAME_KEY, name);
        localStorage.setItem(COMMIT_TIMESTAMP_KEY, timestamp.toString());
        localStorage.setItem(RENT_PRICE_KEY, rentPriceWei.toString());
        localStorage.setItem(DURATION_KEY, duration.toString());
        
        setCommitTimestamp(timestamp);
        setCurrentStep(RegistrationStep.WaitForCommitment);
        startTimer(timestamp);
        setCommitTxHash(hash);
        localStorage.setItem('ens_commit_tx_hash', hash);
      } else {
        throw new Error('Wallet client not available');
      }
    } catch (err) {
      console.error(err);
      setError('Error making commitment');
    } finally {
      setIsLoading(false);
    }
  };

  const registerName = async () => {
    if (!name || !isConnected || !address || !secret) {
      setError('Missing required information');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (walletClient) {
        const hash = await walletClient.writeContract({
          address: ETH_REGISTRAR_CONTROLLER_ADDRESS as `0x${string}`,
          abi: ethRegistrarControllerAbi,
          functionName: 'register',
          args: [
            name,
            address,
            BigInt(duration),
            secret as `0x${string}`,
            BURN_ADDRESS as `0x${string}`,
            [],
            false,
            0
          ],
          value: rentPriceWei
        });

        console.log('Registration transaction hash:', hash);
        
        localStorage.removeItem(COMMITMENT_KEY);
        localStorage.removeItem(SECRET_KEY);
        localStorage.removeItem(NAME_KEY);
        localStorage.removeItem(COMMIT_TIMESTAMP_KEY);
        localStorage.removeItem(RENT_PRICE_KEY);
        localStorage.removeItem(DURATION_KEY);
        
        setCurrentStep(RegistrationStep.Success);
        setRegisterTxHash(hash);
        localStorage.setItem('ens_register_tx_hash', hash);
      } else {
        throw new Error('Wallet client not available');
      }
    } catch (err) {
      console.error(err);
      setError('Error registering name');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setName('');
    setIsAvailable(null);
    setError('');
    setCurrentStep(RegistrationStep.InputName);
  };

  return {
    name,
    setName,
    duration,
    setDuration,
    isAvailable,
    isLoading,
    error,
    currentStep,
    remainingTime,
    rentPriceWei,
    isConnected,
    checkAvailability,
    makeCommitment,
    registerName,
    resetForm,
    loadSavedData,
    commitTxHash,
    registerTxHash,
    commitment
  };
}
