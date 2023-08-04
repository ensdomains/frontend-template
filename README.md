This is a Next.js template designed to get you up and running with a new web3 project as quickly as possible.

## Getting Started

Check out the [live demo](https://ens-frontend-template.vercel.app/) to see what this template looks like.

Built with:

- [Next.js](https://nextjs.org/)
- [Thorin](https://thorin.ens.domains/)
- [Styled Components](https://styled-components.com/)
- [Viem](https://viem.sh/)
- [Wagmi](https://wagmi.sh/)
- [RainbowKit](https://www.rainbowkit.com/)

## How to use

Install dependencies:

```bash
yarn install
```

Create a [WalletConnect account](https://cloud.walletconnect.com/sign-in) and add your Project ID to `.env.local`:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fensdomains%2Ffrontend-template&env=NEXT_PUBLIC_WALLETCONNECT_ID&envDescription=API%20Keys%20needed%20for%20the%20applicatation.)
