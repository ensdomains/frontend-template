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

## Environment Configuration

This project supports multiple blockchain networks through environment variables. By default, it uses the Sepolia testnet.

### Network Configuration

The application uses `dotenv-flow` to load environment variables based on the current network. The network is determined by the `APP_ENV` environment variable.

#### Available Network Configurations:

- **Sepolia Testnet** (default): Uses `.env.sepolia` configuration
- **Ethereum Mainnet**: Uses `.env.mainnet` configuration

### Setting the Network

To run the application on a specific network, set the `APP_ENV` environment variable:

```bash
# For Sepolia testnet (default)
APP_ENV=sepolia yarn dev

# For Ethereum mainnet
APP_ENV=mainnet yarn dev
```

### Environment Files

The project includes separate environment files for each supported network:

- `.env.sepolia`: Configuration for Sepolia testnet
- `.env.mainnet`: Configuration for Ethereum mainnet

Each file contains network-specific variables:

```
NEXT_PUBLIC_ETH_REGISTRAR_CONTROLLER_ADDRESS=<network-specific-address>
NEXT_PUBLIC_RPC_URL=<network-specific-rpc-url>
NEXT_PUBLIC_CHAIN_ID=<network-specific-chain-id>
```

For local development or custom configurations, you can create a `.env.local` file which will override the default values but won't be committed to the repository.

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fensdomains%2Ffrontend-template&env=NEXT_PUBLIC_WALLETCONNECT_ID&envDescription=API%20Keys%20needed%20for%20the%20applicatation.)
