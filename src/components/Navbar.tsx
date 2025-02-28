import { ConnectButton } from '@/components/ConnectButton'
import styled from 'styled-components'

const NavbarContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  width: 100%;
  background-color: transparent;
`

const AppTitle = styled.div`
  font-size: 1rem;
  font-weight: bold;
`

export function Navbar() {
  return (
    <NavbarContainer>
      <AppTitle>ENS REG</AppTitle>
    
      <ConnectButton />
    </NavbarContainer>
  )
} 