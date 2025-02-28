'use client'

import { Container, Layout } from '@/components/templates'
import ENSRegistration from '@/components/ENSRegistration'
import { Navbar } from '@/components/Navbar'

export default function Page() {
  return (
    <Layout>
      <Navbar />

      <Container className="container" as="main" $variant="flexVerticalCenter">
        <h1>ENS Name Registration</h1>
        <p>Register your own .eth domain name</p>
        <ENSRegistration />
      </Container>

      <footer />
    </Layout>
  )
}
