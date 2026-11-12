import { style } from 'zyzz'

import { Nav } from './components/Nav'
import { examples } from './examples'
import { usePathname } from './lib/router'
import { HomeScreen } from './screens/Home'
import { NotFoundScreen } from './screens/NotFound'

export function App() {
  const pathname = usePathname()
  const example = examples.find(
    (e) => e.path === pathname || e.aliases?.some((alias) => alias === pathname)
  )
  const Screen =
    pathname === '/' ? HomeScreen : (example?.Screen ?? NotFoundScreen)

  return (
    <div {...styles.layout()}>
      <Nav />
      <Screen />
    </div>
  )
}

namespace styles {
  export const layout = style({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3rem',
    minHeight: '100svh',
    padding: '1rem 1rem 3rem',
    '@media (min-width: 640px)': { padding: '2rem 2rem 4rem' },
  })
}
