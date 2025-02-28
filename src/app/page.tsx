'use client'

import { Container, Layout } from '@/components/templates'
import ENSRegistration from '@/components/ENSRegistration'
import { Navbar } from '@/components/Navbar'

export default function Page() {
  return (
    <Layout>
      <Navbar />

      <Container className="container" as="main" $variant="flexVerticalCenter" style={{ padding: '2rem' }}>
        <h1>ENS Name Registration</h1>
        <ENSRegistration />
      </Container>

      <footer>
        <p>Made with ❤️ by <a href="https://github.com/f1lander">Edax</a></p>
      </footer>
    </Layout>
  )
}
