import { Heading } from '@ensdomains/thorin'
import { NextSeo } from 'next-seo'

export default function Home() {
  return (
    <>
      <NextSeo title="Home" />

      <main>
        <Heading level="1">ENS Frontend Template</Heading>
      </main>
    </>
  )
}
