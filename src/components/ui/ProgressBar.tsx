import React from 'react';
import styled from 'styled-components';

interface ProgressBarProps {
  value: number; // Value between 0 and 1
  colorStyle?: string;
}

const ProgressContainer = styled.div`
  width: 100%;
  height: 8px;
  background-color: #E2E8F0;
  border-radius: 4px;
  overflow: hidden;
`;

const Progress = styled.div<{ value: number; colorStyle?: string }>`
  height: 100%;
  width: ${props => Math.min(Math.max(props.value * 100, 0), 100)}%;
  background-color: ${props => 
    props.colorStyle === 'accentPrimary' ? '#5298FF' :
    props.colorStyle === 'success' ? '#38A169' :
    props.colorStyle === 'warning' ? '#DD6B20' :
    props.colorStyle === 'error' ? '#E53E3E' :
    '#5298FF'
  };
  transition: width 0.3s ease;
`;

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  colorStyle = 'accentPrimary' 
}) => {
  return (
    <ProgressContainer>
      <Progress value={value} colorStyle={colorStyle} />
    </ProgressContainer>
  );
};

export default ProgressBar; 