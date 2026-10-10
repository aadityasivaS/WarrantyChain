# WarrantyChain

WarrantyChain is a full-stack prototype for product warranties represented as transferable ERC-721 NFTs. Manufacturers can register products and manage claims, while customers can verify, transfer, and submit claims against a warranty on-chain.

## What is included

- `contracts/WarrantyNFT.sol` - ERC-721 warranty contract with manufacturer access control, product metadata, expiry checks, and claim lifecycle management.
- `test/` - Solidity and native Node.js integration tests.
- `frontend/` - Vite + React interface for public verification and wallet actions.
- `ignition/` - Hardhat Ignition deployment module.

## Prerequisites

- Node.js 22 or newer
- pnpm
- MetaMask (for wallet actions in the frontend)

Install dependencies from the repository root:

```shell
pnpm install
```

## Run locally

Start a local Hardhat node in one terminal:

```shell
pnpm node
```

Deploy the warranty contract in a second terminal:

```shell
pnpm deploy:local
```

Copy the deployed address into the frontend configuration:

```shell
pnpm sync:frontend <deployed-contract-address>
```

Start the frontend:

```shell
cd frontend
pnpm dev
```

Open the local Vite URL, connect MetaMask to the local Hardhat network (chain ID `31337`), and import one of the accounts printed by `pnpm node` if needed. Keep the Hardhat node running: restarting it resets its in-memory state, including all minted warranties.

### First warranty flow

Token IDs are assigned when a manufacturer registers a product, starting at `1`. A fresh deployment has no warranty records, so verifying token `1` before minting will correctly revert with `ProductNotFound(1)`.

1. Connect the deploying account in MetaMask. The contract grants that account `MANUFACTURER_ROLE` in its constructor.
2. Use **Register a product** in the frontend to mint a warranty NFT to a customer address.
3. Verify the newly assigned token ID in **Public warranty verification**. The first successful registration creates token `#1`; later registrations increment the ID.
4. To submit a claim, connect the wallet that currently owns the NFT and use **Open a claim**.

If a verification request reports that a token does not exist, check that the frontend is pointing at the same contract address and RPC network used for deployment, then mint a product before retrying.

The frontend can also be configured manually with `frontend/.env.local`:

```dotenv
VITE_WARRANTY_NFT_ADDRESS=0x...
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
```

## Development commands

Run the contract test suites:

```shell
pnpm test
```

Build the contracts and frontend:

```shell
pnpm build
cd frontend
pnpm build
```

Lint the frontend:

```shell
cd frontend
pnpm lint
```

## Sepolia deployment

Set `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` using the Hardhat keystore or environment variables, then deploy:

```shell
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat ignition deploy --network sepolia ignition/modules/WarrantyNFT.ts
```

Never commit private keys or `.env.local` files.
