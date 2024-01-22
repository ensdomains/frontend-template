'use client'

import { ConnectButton } from '@/components/ConnectButton'
import { Container, Layout } from '@/components/templates'

export default function Page() {
  return (
    <Layout>
      <header />

      <Container as="main" $variant="flexVerticalCenter">
        <ConnectButton />
      </Container>

      <footer />
    </Layout>
  )
}
