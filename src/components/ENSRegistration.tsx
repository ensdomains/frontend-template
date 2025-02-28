'use client'

import { useEffect } from 'react'
import { formatEther } from 'viem'
import { 
  Button, 
  Card, 
  EnsSVG, 
  Heading, 
  Typography, 
  Select, 
  Spinner,
  Tag,
  Field,
  Input,
} from '@ensdomains/thorin'
import { Alert } from '@/components/ui/alert'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useEthRegistrar, RegistrationStep } from '@/hooks/useEthRegistrar'
import styled from 'styled-components'
import { useAccount } from 'wagmi'
import { CHAIN_ID } from '@/lib/constants'
import Link from 'next/link'

const Section = styled.div`
  margin-bottom: 1.5rem;
`

const HashDisplay = styled.div`
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  font-family: monospace;
  font-size: 14px;
  word-break: break-all;
  margin-top: 8px;
`

// Helper function to get Etherscan URL based on network
const getEtherscanUrl = (hash: string, type: 'tx' | 'address') => {
  const baseUrl = CHAIN_ID === 1 
    ? 'https://etherscan.io' 
    : 'https://sepolia.etherscan.io';
  
  return `${baseUrl}/${type}/${hash}`;
};

const ENSRegistration = () => {
  const { address } = useAccount()

  const {
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
    commitment,
    commitTxHash,
    registerTxHash
  } = useEthRegistrar();

  console.log("rentPriceWei", rentPriceWei)
  
  useEffect(() => {
    loadSavedData();
  }, []);

  // Render the current step
  const renderStep = () => {
    if (!isConnected) {
      return (
        <Alert title="Not connected">
          Please connect your wallet to register an ENS name
        </Alert>
      );
    }

    switch (currentStep) {
      case RegistrationStep.InputName:
        return (
          <>
            <Section>
              <Heading level="2">Enter your desired ENS name</Heading>
           
            </Section>
            
            <Section>
              <Field label="Name">
                <Input 
                  label=""
                  placeholder="ethdax"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  suffix=".eth"
                />
              </Field>
            </Section>
            
            <Section>
              <Field label="Duration">
                <Select 
                  label=""
                  options={[
                    { value: '31536000', label: '1 year' },
                    { value: '63072000', label: '2 years' },
                    { value: '94608000', label: '3 years' },
                    { value: '157680000', label: '5 years' }
                  ]}
                  value={duration.toString()}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                />
              </Field>
            </Section>
            
            <Button
              onClick={checkAvailability}
              disabled={isLoading || !name}
              loading={isLoading}
              colorStyle="accentPrimary"
            >
              {isLoading ? 'Checking...' : 'Check Availability'}
            </Button>
          </>
        );
      
      case RegistrationStep.CheckingAvailability:
        return (
          <Section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0' }}>
            <Spinner size="large" />
            <Typography style={{ marginTop: '1rem' }}>
              Checking availability of {name}.eth...
            </Typography>
          </Section>
        );
      
      case RegistrationStep.MakeCommitment:
        return (
          <>
            <Section>
              <Heading level="2">{name}.eth is available!</Heading>
              <Typography>You can begin the registration process now</Typography>
            </Section>
            
            <Section>
              <Tag colorStyle="accentPrimary">
                Price: {formatEther(rentPriceWei)} ETH for {duration / 31536000} year(s)
              </Tag>
            </Section>
            
            <Button
              onClick={makeCommitment}
              disabled={isLoading || !name}
              loading={isLoading}
              colorStyle="accentPrimary"
            >
              {isLoading ? 'Processing...' : 'Begin Registration'}
            </Button>
          </>
        );
      
      case RegistrationStep.WaitForCommitment:
        return (
          <>
            <Section>
              <Heading level="2">Waiting for commitment period</Heading>
              <Typography>To prevent front-running, we need to wait for 60 seconds</Typography>
            </Section>
            
            {commitment && (
              <Section>
                <Typography fontVariant="smallBold">Commitment Hash:</Typography>
                <HashDisplay>{commitment}</HashDisplay>
              </Section>
            )}
            
            {commitTxHash && (
              <Section>
                <Typography fontVariant="smallBold">Transaction:</Typography>
                <Link href={getEtherscanUrl(commitTxHash, 'tx')} target="_blank">
                  View on Etherscan
                </Link>
              </Section>
            )}
            
            <Section>
              <ProgressBar value={(60 - remainingTime) / 60} />
              <Typography style={{ marginTop: '0.5rem' }}>
                Time remaining: {remainingTime} seconds
              </Typography>
            </Section>
          </>
        );
      
      case RegistrationStep.Register:
        return (
          <>
            <Section>
              <Heading level="2">Complete Registration</Heading>
              <Typography>You can now complete the registration for {name}.eth</Typography>
            </Section>
            
            {commitment && (
              <Section>
                <Typography fontVariant="smallBold">Commitment Hash:</Typography>
                <HashDisplay>{commitment}</HashDisplay>
              </Section>
            )}
            
            {commitTxHash && (
              <Section>
                <Typography fontVariant="smallBold">Commitment Transaction:</Typography>
                <Link href={getEtherscanUrl(commitTxHash, 'tx')} target="_blank">
                  View on Etherscan
                </Link>
              </Section>
            )}
            
            <Section>
              <Tag colorStyle="accentPrimary">
                Price: {formatEther(rentPriceWei)} ETH for {duration / 31536000} year(s)
              </Tag>
            </Section>
            
            <Button
              onClick={registerName}
              disabled={isLoading || !name}
              loading={isLoading}
              colorStyle="accentPrimary"
            >
              {isLoading ? 'Processing...' : 'Register Now'}
            </Button>
          </>
        );
      
      case RegistrationStep.Success:
        return (
          <>
            <Section style={{ textAlign: 'center', padding: '1rem 0' }}>
              <EnsSVG style={{ margin: '0 auto', width: '64px', height: '64px' }} />
              <Heading level="1" style={{ marginTop: '1rem' }}>Success!</Heading>
              <Typography>
                Congratulations! You've successfully registered {name}.eth
              </Typography>
            </Section>
            
            {registerTxHash && (
              <Section style={{ textAlign: 'center' }}>
                <Typography fontVariant="smallBold">Registration Transaction:</Typography>
                <Link href={getEtherscanUrl(registerTxHash, 'tx')} target="_blank">
                  View on Etherscan
                </Link>
              </Section>
            )}
            
            <Button onClick={resetForm} colorStyle="accentPrimary">
              Register Another Name
            </Button>
          </>
        );
    }
  };

  return (
    <Card>
      {error && (
        <Alert variant="error" title="Error" description={error} />
      )}
      {renderStep()}
    </Card>
  );
};

export default ENSRegistration; 