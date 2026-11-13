import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig } from 'vite'
import { zyzz } from 'zyzz/vite'

/**
 * Content Security Policy, added to index.html as a <meta> tag at build time
 * so it works on any static host (Vercel, Cloudflare, or anything else). Not
 * applied in dev, where Vite needs inline scripts for hot reload.
 *
 * `connect-src` and `img-src` allow any https origin because ENS resolution
 * can call arbitrary CCIP Read gateways and avatars can be hosted anywhere.
 * `frame-ancestors` can't be set from a <meta> tag, so it's a response header
 * (see public/_headers and vercel.json).
 */
const csp = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 'https:', 'wss:'],
  'frame-src': [
    'https://verify.walletconnect.org',
    'https://verify.walletconnect.com',
  ],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
}

function contentSecurityPolicy(): Plugin {
  const content = Object.entries(csp)
    .map(([directive, sources]) => [directive, ...sources].join(' '))
    .join('; ')

  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content },
        injectTo: 'head-prepend',
      },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    zyzz({ reset: true, include: ['src/**'] }),
    react(),
    contentSecurityPolicy(),
  ],
})
