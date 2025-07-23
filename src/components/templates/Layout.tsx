export function Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

// export const Layout = styled.div(
//   ({ theme }) => css`
//     // Vertically centered layout
//     display: flex;
//     align-items: center;
//     flex-direction: column;
//     justify-content: space-between;

//     width: 100%;
//     min-height: 100svh;
//     gap: ${theme.space['6']};
//     padding: ${theme.space['4']};

//     ${mq.sm.min(css`
//       padding: ${theme.space['8']};
//     `)}
//   `
// )
