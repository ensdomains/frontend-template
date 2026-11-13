# Agent guide

This repo is a reference for integrating ENS into frontend apps. Read [README.md](README.md) first for the list of examples and where each one starts.

## Where things live

- ENS logic that doesn't need React: `src/lib/` (start with `registration.ts` and `chains.ts`).
- Hooks wrapping it with wagmi and React Query: `src/hooks/`.
- One screen per example: `src/screens/`, registered in `src/examples.ts`.

## Conventions to keep

- **Every read follows the network toggle.** Get the chain from `useNetwork()`, never hardcode `chainId: 1`. Writes go through `useWalletOnNetwork()` and pass `chainId` and `account` explicitly to wagmi actions.
- **ENS contract addresses come from ENSjs** (`getChainContractAddress` on chains from `src/lib/chains.ts`). Don't hardcode them.
- **Normalize names** with `normalize` from `viem/ens` before resolving or registering. Show primary names only after forward verification (the Universal Resolver's `reverse` does this) and only if already normalized (`normalizedOrNull`).
- **Resolve names wherever an address is shown.** Use `<Identity address={…} />`.
- **ENS records are untrusted input.** Render them as text. Only link to `https:` URLs.
- **Transactions are built as `{ to, data }` calls** so they can be simulated (`eth_simulateV1`), batched (EIP-5792), or sent one by one with the same code.
- **Approvals are exact amounts**, never unlimited.
- **Never reveal a name before its commitment matures.** Calls sent before `register` must not contain the name in plaintext.
- **Confirm transactions with `confirmTransaction`** (`src/lib/transactions.ts`), which rejects cancelled or replaced transactions.
- **Styling** uses zyzz `style()` / `variants()` in a `namespace styles` at the bottom of each file, with the CSS variables from `src/globals.ts`.

## Checks

```bash
npm run build   # typecheck + production build
npm run format
```

There are no unit tests. To check onchain logic, simulate against Sepolia with `simulateBlocks` from `viem/actions` (ENS's Sepolia mock stablecoins, `usdc` and `dai` in ENSjs, have a public `mint`).
