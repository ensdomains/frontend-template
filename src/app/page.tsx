'use client'

import { Button, Card, EnsSVG, Heading, Typography } from '@ensdomains/thorin'

import { Layout } from '@/components/templates'

export default function Home() {
  return (
    <Layout>
      <header />

      <div>
        <div>
          <EnsSVG />
        </div>

        <Heading level="1">ENS Frontend Examples</Heading>

        <div>
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
        </div>
      </div>

      <footer />
    </Layout>
  )
}

// const SvgWrapper = styled.div(
//   ({ theme }) => css`
//     --size: ${theme.space['16']};
//     width: var(--size);
//     height: var(--size);

//     svg {
//       width: 100%;
//       height: 100%;
//     }
//   `
// )

// const ExamplesGrid = styled.div(
//   ({ theme }) => css`
//     width: 100%;
//     display: grid;
//     gap: ${theme.space['4']};
//     grid-template-columns: repeat(auto-fit, minmax(${theme.space['64']}, 1fr));
//   `
// )
