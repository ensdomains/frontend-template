import { type AnchorHTMLAttributes, useSyncExternalStore } from 'react'

/**
 * A tiny client-side router: enough for a handful of static pages without
 * pulling in a routing library. The host serves index.html for every path
 * (see vercel.json), and `usePathname` re-renders on navigation.
 */
const NAVIGATE_EVENT = 'app:navigate'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE_EVENT, onChange)
  }
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () =>
    // Treat "/foo/" the same as "/foo"
    window.location.pathname.replace(/(.)\/$/, '$1')
  )
}

export function navigate(to: string) {
  if (to === window.location.pathname) return
  window.history.pushState(null, '', to)
  window.scrollTo(0, 0)
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
}

/** An anchor for in-app paths, e.g. `<Link href="/register">` */
export function Link({
  href,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: `/${string}` }) {
  return (
    // Content comes from `props.children`
    // oxlint-disable-next-line jsx-a11y/anchor-has-content
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e)
        // Let the browser handle new-tab clicks and anything already handled
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return
        }
        e.preventDefault()
        navigate(href)
      }}
      {...props}
    />
  )
}
