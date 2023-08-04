import { DefaultTheme } from '@ensdomains/thorin'
import styled, { css } from 'styled-components'

type ContainerProps = {
  $gap?: keyof DefaultTheme['space']
  $variant?:
    | 'flexHorizontal'
    | 'flexHorizontalCenter'
    | 'flexVertical'
    | 'flexVerticalCenter'
  $width?: 'medium' | 'large'
}

export const Container = styled.div<ContainerProps>(
  ({ $gap, $variant, $width, theme }) => css`
    ${$variant &&
    css`
      display: flex;
      gap: ${theme.space[$gap || '4']};
    `}

    ${$variant === 'flexHorizontal' &&
    css`
      flex-direction: row;
    `}

    ${$variant === 'flexHorizontalCenter' &&
    css`
      flex-direction: row;
      justify-content: center;
    `}

    ${$variant === 'flexVertical' &&
    css`
      flex-direction: column;
    `}

    ${$variant === 'flexVerticalCenter' &&
    css`
      flex-direction: column;
      align-items: center;
    `}

    width: 100%;
    max-width: ${$width === 'large' ? theme.space['192'] : theme.space['144']};
    margin-left: auto;
    margin-right: auto;
  `
)
