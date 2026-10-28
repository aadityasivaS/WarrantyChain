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
pnpm sync:frontend <deployed-contract-address> [deployment-block]
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
VITE_PUBLIC_APP_URL=https://warranty.example.com
VITE_DEPLOYMENT_BLOCK=0
```

`VITE_PUBLIC_APP_URL` is optional. When it is empty, QR codes use the current browser origin. Set it to the deployed frontend origin when the app is behind a proxy or deployed under a different public URL.
`VITE_DEPLOYMENT_BLOCK` should be set to the block where `WarrantyNFT` was deployed in production. The synchronization command accepts it as an optional second argument and defaults to `0` for local development.

The warranty details card includes a QR code pointing to `/verify/<tokenId>`. The public verification page does not require MetaMask; it reads the record through the configured RPC provider. The QR code is only a link to the blockchain record and is not proof of physical authenticity.

Repair records are append-only and can be created only by accounts granted the existing `SERVICE_ROLE`. Service dates, service-center addresses, repair categories, and optional report references are public on-chain data; do not put confidential customer information or private documents directly on-chain.

The manufacturer can grant a repair center the existing role with `setServiceAccount(address, true)`. That service account can then use **Record completed repair** in the dashboard. The public verification timeline combines ERC-721 transfers, warranty registration, claim submission/status events, and completed repairs from the configured deployment block.

When contract functions change during local development, force a fresh Ignition deployment before syncing the frontend:

```shell
pnpm exec hardhat ignition deploy ignition/modules/WarrantyNFT.ts --network localhost --reset
pnpm sync:frontend <new-deployed-contract-address> [deployment-block]
```

Resetting a local deployment creates a new contract address and does not preserve the old local tokens, roles, claims, or repairs.

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
