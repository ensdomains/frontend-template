import { Button, Card, EnsSVG, Heading, Typography } from '@ensdomains/thorin'
import { NextSeo } from 'next-seo'
import styled, { css } from 'styled-components'

import { Container, Layout } from '@/components/templates'

export default function Home() {
  return (
    <>
      <NextSeo title="Home" />

      <Layout>
        {/* Placeholder for the header */}
        <header />

        {/* Main content */}
        <Container as="main" $variant="flexVerticalCenter">
          <SvgWrapper>
            <EnsSVG />
          </SvgWrapper>

          <Heading level="1">ENS Frontend Examples</Heading>

          <Card title="Name/Address Input">
            <Typography color="textSecondary">
              Every address input should also accept ENS names.
            </Typography>

            <Button as="a" href="/input">
              View
            </Button>
          </Card>
        </Container>

        {/* Placeholder for the footer */}
        <footer />
      </Layout>
    </>
  )
}

const SvgWrapper = styled.div(
  ({ theme }) => css`
    --size: ${theme.space['16']};
    width: var(--size);
    height: var(--size);

    svg {
      width: 100%;
      height: 100%;
    }
  `
)
