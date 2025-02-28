/** @type {import('next').NextConfig} */

import { config } from 'dotenv-flow';
const APP_ENV = process.env.APP_ENV || 'sepolia';

config({
  node_env: APP_ENV,
  allow_empty_values: false,
});

const env = {};

for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith('NEXT_PUBLIC_')) {
    env[key] = value;
  }
}
const nextConfig = {
  env,
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
}

export default nextConfig;
