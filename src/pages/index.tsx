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
        <Container as="main" $variant="flexVerticalCenter" $width="large">
          <SvgWrapper>
            <EnsSVG />
          </SvgWrapper>

          <Heading level="1">ENS Frontend Examples</Heading>

          <ExamplesGrid>
            <Card title="Name/Address Input">
              <Typography color="textSecondary">
                Every address input should also accept ENS names.
              </Typography>

              <Button as="a" href="/input">
                View
              </Button>
            </Card>

            <Card title="ENS Profile">
              <Typography color="textSecondary">
                Show the primary and avatar for an ENS name.
              </Typography>

              <Button as="a" href="/profile">
                View
              </Button>
            </Card>
          </ExamplesGrid>
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

const ExamplesGrid = styled.div(
  ({ theme }) => css`
    width: 100%;
    display: grid;
    gap: ${theme.space['4']};
    grid-template-columns: repeat(auto-fit, minmax(${theme.space['64']}, 1fr));
  `
)
