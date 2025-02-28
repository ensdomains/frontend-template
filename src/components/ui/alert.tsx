import React from 'react';
import styled from 'styled-components';

interface AlertProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  variant?: 'error' | 'warning' | 'info' | 'success';
}

const AlertContainer = styled.div<{ variant: string }>`
  display: flex;
  flex-direction: column;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  border: 1px solid;
  
  ${props => {
    switch(props.variant) {
      case 'error':
        return `
          background-color: #FFEFEF;
          border-color: #F87171;
          color: #B91C1C;
        `;
      case 'warning':
        return `
          background-color: #FFF7ED;
          border-color: #FDBA74;
          color: #C2410C;
        `;
      case 'success':
        return `
          background-color: #ECFDF5;
          border-color: #6EE7B7;
          color: #065F46;
        `;
      case 'info':
      default:
        return `
          background-color: #F0F9FF;
          border-color: #93C5FD;
          color: #1E40AF;
        `;
    }
  }}
`;

const AlertTitle = styled.div`
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
`;

const AlertDescription = styled.div`
  font-size: 14px;
`;

export const Alert: React.FC<AlertProps> = ({ 
  title, 
  description, 
  children, 
  variant = 'info' 
}) => {
  return (
    <AlertContainer variant={variant}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
      {children}
    </AlertContainer>
  );
};

export default Alert; 