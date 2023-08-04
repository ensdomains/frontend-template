import { Button, Profile, mq } from '@ensdomains/thorin'
import { ConnectButton as ConnectButtonBase } from '@rainbow-me/rainbowkit'
import { useDisconnect } from 'wagmi'
import styled, { css } from 'styled-components'

const StyledButton = styled(Button)`
  ${({ theme }) => css`
    width: fit-content;

    ${mq.xs.min(css`
      min-width: ${theme.space['45']};
    `)}
  `}
`

export function ConnectButton() {
  const { disconnect } = useDisconnect()

  return (
    <ConnectButtonBase.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <StyledButton shape="rounded" onClick={openConnectModal}>
                    Connect
                  </StyledButton>
                )
              }

              if (chain.unsupported) {
                return (
                  <StyledButton
                    shape="rounded"
                    colorStyle="redPrimary"
                    onClick={openChainModal}
                  >
                    Wrong network
                  </StyledButton>
                )
              }

              return (
                <Profile
                  address={account.address}
                  ensName={account.ensName || undefined}
                  avatar={account.ensAvatar || undefined}
                  onClick={openAccountModal}
                  dropdownItems={[
                    {
                      label: 'Copy Address',
                      color: 'text',
                      onClick: () => copyToClipBoard(account.address),
                    },
                    {
                      label: 'Disconnect',
                      color: 'red',
                      onClick: () => disconnect(),
                    },
                  ]}
                />
              )
            })()}
          </div>
        )
      }}
    </ConnectButtonBase.Custom>
  )
}

const copyToClipBoard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}
