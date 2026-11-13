# ENS Frontend Examples

Reference implementations of ENS features for frontend apps, built with [wagmi](https://wagmi.sh), [viem](https://viem.sh), and [ENSjs](https://github.com/ensdomains/ensjs). Every example works on Ethereum mainnet and Sepolia: pick one with the toggle in the nav bar.

The code is meant to be read and copied. ENS logic lives in small, framework-free functions and hooks, separate from the UI.

If you're looking for an example of something that isn't here, [please open an issue](https://github.com/ensdomains/frontend-template/issues).

## Examples

| Example                                        | What it shows                                                                                   | Start reading at                                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Name or address input](src/screens/Input.tsx) | Accept ENS names anywhere an address is accepted, and show the primary name of pasted addresses | [`useAddressOrName`](src/hooks/useAddressOrName.ts)                                             |
| [Profile records](src/screens/Profile.tsx)     | Avatar, addresses, text records, and content hash of any name, in one Universal Resolver call   | [`useProfile`](src/hooks/useProfile.ts)                                                         |
| [Primary names](src/screens/PrimaryNames.tsx)  | An address's primary name on L1 and each L2, without waiting for L2 propagation                 | [`useEnsNameOptimistic`](src/hooks/useEnsNameOptimistic.ts)                                     |
| [Register a name](src/screens/Register.tsx)    | ENSv2 `.eth` registration paid in stablecoins, with a resolver the owner controls               | [`registration.ts`](src/lib/registration.ts), [`useRegistration`](src/hooks/useRegistration.ts) |

Names are resolved everywhere an address is shown, including the connected account in the nav ([`Identity`](src/components/Identity.tsx), [`usePrimaryName`](src/hooks/usePrimaryName.ts)).

## How it's organized

```
src/
  lib/          Plain TypeScript: chains, wagmi config, registration logic, router
  hooks/        React hooks that wrap lib/ with React Query and wagmi
  components/   UI primitives (Button, Input, Card), wallet modal, nav
  screens/      One file per example
  examples.ts   The list of examples, shared by the home page and router
```

- **Network toggle.** [`lib/network.tsx`](src/lib/network.tsx) holds the selected network (persisted in `localStorage`). Every read uses it. Writes ask the wallet to switch to it first ([`useWalletOnNetwork`](src/hooks/useWalletOnNetwork.ts)), so a transaction never goes to a different chain than the one on screen.
- **Chains.** [`lib/chains.ts`](src/lib/chains.ts) wraps viem's chains with ENSjs's `addEnsContracts`, so every ENS contract address comes from ENSjs rather than being hardcoded.
- **Wallets.** wagmi on its own: browser wallets via EIP-6963, plus WalletConnect with a QR code when a project ID is set. No RainbowKit or similar.
- **Styling.** [zyzz](https://zyzz.style) with the ENS brand colors and type in [`globals.ts`](src/globals.ts), shared with [ENS Fairy](https://github.com/gskril/ens-fairy).

## Registering on ENSv2

ENSv2 keeps the commit/reveal flow from v1, with a few differences that are easy to miss:

1. **Payment is an ERC-20** (USDC or DAI on mainnet, set per network in `PAYMENT_TOKENS`), so the registrar needs an approval. This example approves the exact price, never an unlimited amount.
2. **Names should point at a resolver the owner controls.** ENSjs defaults to no resolver, which registers a name that doesn't resolve. This example uses the owner's `OwnedResolver`: a `PermissionedResolver` proxy deployed through the ENS `VerifiableFactory` with CREATE2. Its address is derived from the owner, so it's known before it exists, goes into the commitment, and is reused for every name the owner registers. Only the owner can deploy it.
3. **Keep the name private until the reveal.** Only the commitment hash goes onchain before the wait. The name's ETH address is set on the resolver in the same batch as `register` (or right after it), so the name resolves as soon as it's registered without leaking it to the mempool early.
4. **Primary names are a separate step**, through the reverse registrar.

The setup (resolver, approval, commit) and the register step (register, address record) each go out as one [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) batch for wallets that support atomic calls, or as separate transactions otherwise. Replaced or cancelled transactions are treated as failures ([`lib/transactions.ts`](src/lib/transactions.ts)). Before anything is sent, the whole flow is simulated with `eth_simulateV1` so a registration that would fail costs nothing. The commit secret is saved in `localStorage`, so reloading during the 60 second wait doesn't lose the commitment.

On Sepolia, you can pay with Circle's test USDC (from [faucet.circle.com](https://faucet.circle.com)) or ENS's mock stablecoin, which anyone can mint: connect on Sepolia and use the "Mint 100 mock USD" button under the form.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

| Script              |                                |
| ------------------- | ------------------------------ |
| `npm run dev`       | Start the dev server           |
| `npm run build`     | Typecheck and build to `dist/` |
| `npm run typecheck` | Typecheck only                 |
| `npm run format`    | Format with Prettier           |

### Configuration

Optional. Copy [`.env.example`](.env.example) to `.env.local`:

- `VITE_WALLETCONNECT_PROJECT_ID`: enables WalletConnect (from [dashboard.reown.com](https://dashboard.reown.com)). Without it, only browser wallets are offered.
- `VITE_MAINNET_RPC_URL`, `VITE_SEPOLIA_RPC_URL`: your own RPCs. Defaults to [PublicNode](https://publicnode.com).

These are bundled into the client, so only use values that are safe to make public.

### Deployment

It's a static site. [`vercel.json`](vercel.json) serves `index.html` for every path and sets security headers, including a Content Security Policy. `connect-src` and `img-src` allow any https origin because ENS resolution can call arbitrary CCIP Read gateways and avatars can be hosted anywhere.
