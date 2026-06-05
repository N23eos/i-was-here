# I Was Here

**Gasless proof-of-attendance NFTs on Base.** An organizer creates an event, a guest
scans a QR code, connects a wallet, and claims an ERC-1155 attendance badge — without
paying gas. Badges accumulate into collectible levels.

> Live on **Base mainnet**. A real badge has been claimed end-to-end with gas fully
> sponsored by a paymaster (claimer paid 0 ETH).

---

## Why

POAP-style attendance badges, rebuilt **Base-native**:

- **Frictionless onboarding** — Base Account (email sign-in), plus MetaMask / Rabby.
- **Truly gasless** — the user signs, the paymaster pays (ERC-4337 + EIP-5792 + ERC-7677).
- **On-chain utility** — badges roll up into levels (Bronze → Platinum), the foundation
  for perks / token-gating, not just souvenirs.

## How it works

1. **Create event** — organizer (contract owner) creates an event server-side. A
   per-event signing key is generated and stored AES-256-GCM encrypted.
2. **Share QR** — two modes:
   - `simple` — unique printable QR stickers (PDF via `pdf-lib`), one per guest.
   - `secure` — one shared static QR on screen, limited to **1 badge per wallet**
     (enforced on-chain via `balanceOf`).
3. **Claim** — guest opens the link, connects a wallet, taps **Claim**. The claim is
   authorized by an EIP-191 signature over `keccak256(abi.encodePacked(claimUUID, eventId))`
   and minted gasless through the paymaster. Wallets without EIP-5792 fall back to a
   normal self-paid `writeContract`.
4. **Collect** — badges show up in the holder's collection with an off-chain level
   derived from badge count.

## Tech stack

| Layer | Stack |
|-------|-------|
| Contract | Solidity, **ERC-1155** (`AttendanceNFT`), Foundry, OpenZeppelin 5.6.1 |
| Frontend | **Next.js 16** (App Router, Turbopack), TypeScript, Tailwind v4 |
| Web3 | **wagmi v3** + **viem**, Base Account (`@base-org/account`), EIP-6963 discovery |
| Gasless | EIP-5792 `wallet_sendCalls` + ERC-7677 `paymasterService`, **Pimlico** paymaster (no-KYC) |
| Backend | Next.js API routes, **Prisma** + Postgres |

Network is a single env switch (`NEXT_PUBLIC_CHAIN_ID`) — testnet ↔ mainnet.

## Deployed contracts

| Network | `AttendanceNFT` (ERC-1155) |
|---------|----------------------------|
| Base mainnet | [`0x8349c28226ac5D42020bb7fD30052dEc63d371ca`](https://basescan.org/address/0x8349c28226ac5D42020bb7fD30052dEc63d371ca) |
| Base Sepolia | [`0xC53f9f1855d34854BC4778cfbFBC0C14966AEe41`](https://sepolia.basescan.org/address/0xC53f9f1855d34854BC4778cfbFBC0C14966AEe41) |

## Repository layout

```text
web/        Next.js app — claim flow, organizer dashboard, collection, API, Prisma
contracts/  Foundry project — AttendanceNFT.sol + tests
```

## Quickstart

Prerequisites: Node.js ≥ 20.9, pnpm, Foundry (`forge`/`cast`), Postgres.

```bash
# 1. Frontend
cd web
pnpm install
cp ../.env.example .env        # fill in values (see below)
pnpm prisma migrate dev
pnpm dev                       # http://localhost:3000

# 2. Contracts
cd contracts
forge build
forge test
```

### Environment

Copy `.env.example` and fill in. Never commit a real `.env`.

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_CHAIN_ID` | `8453` mainnet / `84532` Base Sepolia |
| `NEXT_PUBLIC_ATTENDANCE_NFT_ADDRESS` | deployed contract address |
| `NEXT_PUBLIC_RPC_URL` | Base RPC endpoint |
| `DATABASE_URL` | Postgres connection string |
| `PAYMASTER_URL` | Pimlico paymaster RPC (server-only secret) |
| `DEPLOYER_PRIVATE_KEY` | contract owner, server-side event creation |
| `SIGNER_MASTER_KEY` | 32-byte hex, AES-256-GCM for per-event keys |

## Architecture & roadmap

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design and locked decisions.
- [`ROADMAP.md`](./ROADMAP.md) — post-MVP scope (on-chain levels, perks, event types).

## License

[MIT](./LICENSE)
