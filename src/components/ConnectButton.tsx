import { useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

import { Button } from './ui/button'

export function ConnectButton() {
  const { connect } = useConnect()

  return (
    <Button onClick={() => connect({ connector: injected() })}>Connect</Button>
  )
}
