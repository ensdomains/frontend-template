import { NextSeo } from 'next-seo'

import { ConnectButton } from '@/components/ConnectButton'
import { Container, Layout } from '@/components/templates'

export default function Page() {
  return (
    <>
      <NextSeo title="Profile" />

      <Layout>
        <header />

        <Container as="main" $variant="flexVerticalCenter">
          <ConnectButton />
        </Container>

        <footer />
      </Layout>
    </>
  )
}
