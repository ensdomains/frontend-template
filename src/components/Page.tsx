import type { ReactNode } from 'react'
import { style } from 'zyzz'

import { Link } from '../lib/router'
import { GithubIcon } from './icons'

const REPO_URL = 'https://github.com/ensdomains/frontend-template'

/** Shared layout for an example: title, intro, content, and a source link. */
export function Page({
  title,
  description,
  source,
  children,
}: {
  title: string
  description: ReactNode
  /** Path of the file to link to on GitHub, e.g. "src/screens/Input.tsx" */
  source?: string
  children: ReactNode
}) {
  return (
    <main {...styles.main()}>
      <header {...styles.header()}>
        <Link href="/" {...styles.back()}>
          ← All examples
        </Link>
        <h1 {...styles.title()}>{title}</h1>
        <p {...styles.description()}>{description}</p>
      </header>
      {children}
      {source && (
        <a
          href={`${REPO_URL}/blob/main/${source}`}
          target="_blank"
          rel="noopener noreferrer"
          {...styles.source()}
        >
          <GithubIcon /> View the code
        </a>
      )}
    </main>
  )
}

namespace styles {
  export const main = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '100%',
    maxWidth: '40rem',
  })

  export const header = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  })

  export const back = style({
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '0.9375rem',
    ':hover': { color: 'var(--blue)' },
  })

  // Brand headline: 96% line height, -3% letter spacing
  export const title = style({
    margin: 0,
    fontSize: '2rem',
    fontWeight: 500,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  })

  export const description = style({
    margin: 0,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: '1.1875rem',
    lineHeight: 1.35,
  })

  export const source = style({
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'center',
    gap: '0.5rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '0.9375rem',
    ':hover': { color: 'var(--blue)' },
  })
}
