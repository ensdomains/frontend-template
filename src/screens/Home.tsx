import { style } from 'zyzz'

import { examples } from '../examples'
import { useNetwork } from '../lib/network'
import { Link } from '../lib/router'

export function HomeScreen() {
  const { name } = useNetwork()

  return (
    <main {...styles.main()}>
      <header {...styles.header()}>
        <h1 {...styles.title()}>
          ENS{' '}
          <span {...styles.titleMono()}>
            <span {...styles.bracket()}>[</span>examples
            <span {...styles.bracket()}>]</span>
          </span>
        </h1>
        <p {...styles.subtitle()}>
          Reference implementations of ENS features for frontend apps, built
          with wagmi, viem, and ENSjs. Reading from {name}; switch networks in
          the top right.
        </p>
      </header>

      <div {...styles.grid()}>
        {examples.map((example) => (
          <Link key={example.path} href={example.path} {...styles.card()}>
            <span {...styles.cardTitle()}>{example.title}</span>
            <span {...styles.cardDescription()}>{example.description}</span>
            <span {...styles.cardCta()}>View example →</span>
          </Link>
        ))}
      </div>
    </main>
  )
}

namespace styles {
  export const main = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5rem',
    width: '100%',
    maxWidth: '48rem',
  })

  export const header = style({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    textAlign: 'center',
  })

  // Brand headline: 96% line height, -3% letter spacing
  export const title = style({
    margin: 0,
    fontSize: '2.5rem',
    fontWeight: 500,
    letterSpacing: '-0.03em',
    lineHeight: 0.96,
    '@media (min-width: 640px)': { fontSize: '4rem' },
  })

  // The brand's bracketed, semi-mono emphasis
  export const titleMono = style({
    fontFamily: 'var(--font-mono)',
    letterSpacing: '-0.06em',
    whiteSpace: 'nowrap',
  })

  export const bracket = style({
    color: 'var(--blue-light)',
    fontFamily: 'var(--font)',
    fontWeight: 400,
  })

  export const subtitle = style({
    maxWidth: '34rem',
    margin: 0,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: '1.1875rem',
    lineHeight: 1.35,
  })

  export const grid = style({
    display: 'grid',
    gap: '1rem',
    '@media (min-width: 640px)': { gridTemplateColumns: '1fr 1fr' },
  })

  export const card = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1.25rem 1.5rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--surface)',
    transitionProperty: 'transform, border-color',
    transitionDuration: '150ms',
    ':hover': {
      transform: 'translateY(-2px)',
      borderColor: 'var(--border-strong)',
    },
    ':focus-visible': {
      outline: '2px solid var(--blue)',
      outlineOffset: '2px',
    },
  })

  export const cardTitle = style({
    fontSize: '1.25rem',
    fontWeight: 500,
    letterSpacing: '-0.02em',
  })

  export const cardDescription = style({
    flex: 1,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: '1.0625rem',
    lineHeight: 1.35,
  })

  export const cardCta = style({
    marginTop: '0.5rem',
    color: 'var(--blue)',
    fontWeight: 500,
  })
}
