'use client'

import { useEffect, useState } from 'react'
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
import { Stepper } from '@/components/ui/Stepper'
import { useEthRegistrar, RegistrationStep } from '@/hooks/useEthRegistrar'
import { Section } from '@/components/ui/Section'
import { ButtonsContainer } from '@/components/ui/ButtonsContainer'
import { HashDisplay } from '@/components/ui/HashDisplay'
import { useAccount } from 'wagmi'
import { getEtherscanUrl } from '@/lib/utils'
import Link from 'next/link'
import { 
  Search, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  RotateCcw,
  ExternalLink
} from 'lucide-react'
import { ENS_FACTS, STEP_LABELS } from '@/lib/constants';

const getRandomENSFact = (seed: number) => {
  return ENS_FACTS[seed % ENS_FACTS.length];
};

const ENSRegistration = () => {
  const { chainId } = useAccount()
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const {
    name,
    setName,
    duration,
    setDuration,
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

  useEffect(() => {
    const newCompletedSteps: number[] = [];
    
    // Mark all previous steps as completed
    for (let i = 0; i < currentStep; i++) {
      newCompletedSteps.push(i);
    }
    
    // Special case: if we're at the Register step, mark the Wait step as completed
    if (currentStep === RegistrationStep.Register) {
      newCompletedSteps.push(RegistrationStep.WaitForCommitment);
    }
    
    // Special case: if we're at the Success step, mark all steps as completed
    if (currentStep === RegistrationStep.Success) {
      for (let i = 0; i < STEP_LABELS.length; i++) {
        newCompletedSteps.push(i);
      }
    }
    
    setCompletedSteps(newCompletedSteps);
  }, [currentStep]);

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
              prefix={<Search size={18} />}
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
              <Typography style={{ marginTop: '0.5rem', textAlign: 'center' }}>You can begin the registration process now</Typography>
            </Section>
            
            <Section>
              <Tag colorStyle="accentPrimary">
                Price: {formatEther(rentPriceWei)} ETH for {duration / 31536000} year(s)
              </Tag>
            </Section>
            
            <ButtonsContainer>
              <Button
                onClick={makeCommitment}
                disabled={isLoading || !name}
                loading={isLoading}
                colorStyle="accentPrimary"
                prefix={<ArrowRight size={18} />}
              >
                {isLoading ? 'Processing...' : 'Begin Registration'}
              </Button>
              
              <Button
                onClick={resetForm}
                disabled={isLoading}
                colorStyle="greyPrimary"
                prefix={<RotateCcw size={18} />}
              >
                Start Over
              </Button>
            </ButtonsContainer>
          </>
        );
      
      case RegistrationStep.WaitForCommitment:
        return (
          <>
            <Section>
              <Heading level="2">Waiting for commitment period</Heading>
              <Typography>
                To prevent front-running, we need to wait for 60 seconds before completing your registration.
              </Typography>
            </Section>
            
            <Section>
              <Typography fontVariant="small" style={{ marginBottom: '1rem' }}>
                <strong>Why the wait?</strong> This waiting period is a security measure that protects your registration from being intercepted by others.
              </Typography>
              
              <ProgressBar value={(60 - remainingTime) / 60} />
              <Typography style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
                <Clock size={16} style={{ marginRight: '4px' }} />
                Time remaining: {remainingTime} seconds
              </Typography>
            </Section>
            
      
            <Section style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
              <Typography fontVariant="headingThree" style={{ marginBottom: '8px' }}>
                Did you know?
              </Typography>
              <Typography>
                {getRandomENSFact(Math.floor(remainingTime / 10))}
              </Typography>
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
                <Link href={getEtherscanUrl(commitTxHash, 'tx', chainId)} target="_blank">
                  <Button 
                    as="a" 
                    colorStyle="accentPrimary"
                    size="small"
                    prefix={<ExternalLink size={16} />}
                  >
                    View on Etherscan
                  </Button>
                </Link>
              </Section>
            )}
            
            <ButtonsContainer>
              <Button
                onClick={() => window.open('https://ens.domains', '_blank')}
                colorStyle="accentSecondary"
                prefix={<ExternalLink size={18} />}
              >
                Learn More About ENS
              </Button>
              
              <Button
                onClick={resetForm}
                disabled={isLoading}
                colorStyle="greyPrimary"
                prefix={<RotateCcw size={18} />}
              >
                Start Over
              </Button>
            </ButtonsContainer>
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
                <Link href={getEtherscanUrl(commitTxHash, 'tx', chainId)} target="_blank">
                  <Button 
                    as="a" 
                    colorStyle="accentPrimary"
                    size="small"
                    prefix={<ExternalLink size={16} />}
                  >
                    View on Etherscan
                  </Button>
                </Link>
              </Section>
            )}
            
            <Section>
              <Tag colorStyle="accentPrimary">
                Price: {formatEther(rentPriceWei)} ETH for {duration / 31536000} year(s)
              </Tag>
            </Section>
            
            <ButtonsContainer>
              <Button
                onClick={registerName}
                disabled={isLoading || !name}
                loading={isLoading}
                colorStyle="accentPrimary"
                prefix={<CheckCircle size={18} />}
              >
                {isLoading ? 'Processing...' : 'Register Now'}
              </Button>
              
              <Button
                onClick={resetForm}
                disabled={isLoading}
                colorStyle="greyPrimary"
                prefix={<RotateCcw size={18} />}
              >
                Start Over
              </Button>
            </ButtonsContainer>
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
                <Link href={getEtherscanUrl(registerTxHash, 'tx', chainId)} target="_blank">
                  <Button 
                    as="a" 
                    colorStyle="accentPrimary"
                    size="small"
                    prefix={<ExternalLink size={16} />}
                  >
                    View on Etherscan
                  </Button>
                </Link>
              </Section>
            )}
            
            <Button
              onClick={resetForm}
              colorStyle="accentPrimary"
              prefix={<RefreshCw size={18} />}
            >
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
      
      {isConnected && currentStep !== RegistrationStep.CheckingAvailability && (
        <Stepper 
          steps={STEP_LABELS} 
          currentStep={currentStep} 
          completedSteps={completedSteps} 
        />
      )}
      
      {renderStep()}
    </Card>
  );
};

export default ENSRegistration; 