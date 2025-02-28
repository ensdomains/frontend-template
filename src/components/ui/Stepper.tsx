import React from 'react';
import styled from 'styled-components';
import { CheckCircle2, Circle } from 'lucide-react';

interface StepperProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
}

const StepperContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  position: relative;
`;

const StepConnector = styled.div`
  position: absolute;
  top: 16px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #e2e8f0;
  z-index: 0;
`;

const Step = styled.div<{ isActive: boolean; isCompleted: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const StepIcon = styled.div<{ isActive: boolean; isCompleted: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => 
    props.isCompleted ? '#5298FF' : 
    props.isActive ? '#ffffff' : '#f8fafc'};
  border: 2px solid ${props => 
    props.isCompleted ? '#5298FF' : 
    props.isActive ? '#5298FF' : '#e2e8f0'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: ${props => 
    props.isCompleted ? '#ffffff' : 
    props.isActive ? '#5298FF' : '#94a3b8'};
`;

const StepLabel = styled.div<{ isActive: boolean; isCompleted: boolean }>`
  font-size: 14px;
  font-weight: ${props => (props.isActive || props.isCompleted) ? '600' : '400'};
  color: ${props => 
    props.isCompleted ? '#5298FF' : 
    props.isActive ? '#5298FF' : '#64748b'};
  text-align: center;
  max-width: 100px;
`;

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, completedSteps }) => {
  return (
    <StepperContainer>
      <StepConnector />
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.includes(index);
        
        return (
          <Step key={index} isActive={isActive} isCompleted={isCompleted}>
            <StepIcon isActive={isActive} isCompleted={isCompleted}>
              {isCompleted ? (
                <CheckCircle2 size={18} />
              ) : (
                <Circle size={18} />
              )}
            </StepIcon>
            <StepLabel isActive={isActive} isCompleted={isCompleted}>
              {step}
            </StepLabel>
          </Step>
        );
      })}
    </StepperContainer>
  );
};

export default Stepper; 