# Architecture — I Was Here

Gasless proof-of-attendance NFTs on Base. A guest claims an ERC-1155 badge for an
event and collects badges across events. Gasless minting uses ERC-4337 account
abstraction via EIP-5792 + ERC-7677, with a Pimlico paymaster. Live on Base mainnet.

> Verified against Base docs (docs.base.org):
> - Gasless = **EIP-5792** (`wallet_sendCalls`) + **ERC-7677** capability `paymasterService.url`.
> - Paymaster URL is **proxied** through the backend — never exposed to the client.
> - Wallet stack: **wagmi v3 + viem + Base Account** (`@base-org/account`), MetaMask/Rabby
>   via EIP-6963 discovery. `ssr: true` + `cookieStorage` for Next.js.
> - Base mainnet chainId **8453**; Base Sepolia **84532**. Switched by one env var.

---

## Design decisions

| Topic | Decision |
|-------|----------|
| Key storage | env master key + **AES-256-GCM** for per-event signer keys |
| QR contents | short **token** only (`/claim/{token}`); full payload in DB |
| Signature | **EIP-191** over `keccak256(abi.encodePacked(claimUUID, eventId))` |
| Gasless | sponsor via paymaster; wallets without EIP-5792 fall back to self-paid `writeContract` |
| Levels | **off-chain**, derived from badge count (on-chain is roadmap) |
| Scope | narrow MVP; contract designed **extensible** so roadmap features don't break `usedClaims` |

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4 | SSR/API routes, Vercel-native |
| Wallet | wagmi v3 + viem + Base Account (`@base-org/account`), EIP-6963 | Base Account enables smart-wallet/gasless; EIP-6963 auto-discovers injected wallets |
| Wagmi SSR | `ssr: true` + `cookieStorage` | avoids hydration mismatch (Base quickstart) |
| Contracts | Foundry | fast tests, fuzzing, deploy scripts |
| Database | Postgres + Prisma | typed migrations, FK indexes |
| QR / PDF | `qrcode`, `pdf-lib` | QR images, printable sticker sheets |
| Metadata | Pinata (IPFS) + local JSON fallback | `uri(tokenId)` metadata |
| Paymaster | **Pimlico** (ERC-7677) | sponsors the guest UserOp; no KYC; proxied URL |
| Deploy | Vercel, Base Sepolia → mainnet | Next.js-native |

**Why not a naive backend relayer:** if the backend calls `claim()`, `msg.sender = relayer`
and the NFT would go to the relayer. Instead: (a) the contract mints to an explicit
`recipient`; (b) the tx is sent from the guest's smart account via `wallet_sendCalls`,
gas sponsored by the paymaster.

**Hashing detail:** signatures use viem `keccak256` — **never** Node's `sha3-256`
(NIST-SHA3 ≠ Keccak, `ecrecover` would not match).

---

## System diagram

```
            ┌──────────────────────────────────────────────┐
            │            ORGANIZER (browser)               │
            │  /organizer dashboard                        │
            │  - create event (mode: simple | secure)      │
            └───────────────────┬──────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (Next.js API routes)                       │
│  POST /api/events                  create event: keypair (viem),          │
│                                    priv → AES-256-GCM → DB, pub → on-chain │
│  POST /api/events/[id]/qr          SIMPLE: batch of claim tokens + PDF     │
│  POST /api/events/[id]/claim-shared SECURE: shared QR, 1 badge per wallet  │
│  GET  /api/claim?token=            returns {eventId, claimUUID, signature} │
│  POST /api/paymaster (proxy)       forwards to Pimlico (URL hidden)        │
│   ┌──────────┐     ┌───────────────────────────────────────────┐         │
│   │ Postgres │◄───►│ master key (env) AES-encrypts signer keys   │         │
│   └──────────┘     └───────────────────────────────────────────┘         │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │  guest scans QR → /claim/{token} or /e/{id}
                                ▼
┌──────────────────────────────────────┐      ┌──────────────────────────────┐
│        GUEST (mobile browser)        │      │       Pimlico Paymaster      │
│  wagmi + Base Account                │◄────►│  sponsors UserOp gas         │
│  wallet_sendCalls(claim, paymaster)  │      │  (unavailable → self-pay)    │
└──────────────────┬───────────────────┘      └──────────────┬───────────────┘
                   │  UserOp (sender = guest smart account)   ▼
       ┌──────────────────────────────────────────────────────────────┐
       │                   Base mainnet (chainId 8453)                 │
       │  AttendanceNFT.sol (ERC-1155, extensible)                     │
       │  claim(eventId, claimUUID, recipient, signature):             │
       │    ECDSA.recover(EIP191(keccak256(packed(uuid,eventId)))) ==  │
       │      event.signerAddress                                      │
       │    !usedClaims[claimUUID] · within window · minted < maxSupply │
       │    _mint(recipient, eventId, 1, "")   ← recipient, not sender  │
       └──────────────────────────────────────────────────────────────┘

   off-chain levels: frontend reads balanceOf across eventIds → count → level
```

---

## Claim flow (organizer → mint)

1. Organizer creates an event on `/organizer`: name, time window, maxSupply, image,
   **mode: `simple` | `secure`**.
2. `POST /api/events`: generate keypair (viem) → encrypt priv with AES-256-GCM →
   `Event.encryptedSignerKey`; call on-chain `createEvent(...)` with `signerAddress`,
   window, supply, uri; upload badge metadata to Pinata.
3. Claim tokens depend on mode:
   - **SIMPLE** — `POST /api/events/[id]/qr?count=N` returns a batch of `ClaimToken`s
     (uuid, signature, TTL) and a printable sticker PDF (`pdf-lib`). One per guest.
   - **SECURE** — one shared static QR on `/e/{id}`; `claim-shared` issues a token on
     demand and limits to **1 badge per wallet** (checked on-chain via `balanceOf`).
4. Guest scans QR → claim page → connects a wallet → `recipient = address`.
5. `GET /api/claim?token=` returns `{ eventId, claimUUID, signature }`.
6. Frontend calls `wallet_sendCalls(claim, ...)` with capability
   `paymasterService.url = /api/paymaster`. Non-EIP-5792 wallets fall back to a
   self-paid `writeContract`.
7. Contract verifies signature/uniqueness/window/supply → `_mint(recipient, eventId, 1)`,
   emits `Claimed`.
8. Frontend `/collection` shows the new badge and recomputes the off-chain level.

---

## Signing key lifecycle

```
Create event
  └─ viem generatePrivateKey() → privKey
        ├─ privateKeyToAccount(privKey).address → on-chain Event.signerAddress
        └─ AES-256-GCM(privKey, MASTER_KEY)      → DB Event.encryptedSignerKey

Sign claim token
  └─ decrypt privKey
        └─ h = keccak256(abi.encodePacked(claimUUID, eventId))   ← viem
              └─ sig = signMessage({ raw: h })  → EIP-191         → stored in ClaimToken

Verify (on-chain)
  └─ ECDSA.recover(toEthSignedMessageHash(h), sig) == Event.signerAddress
```

- The private key **never** reaches the client.
- `abi.encodePacked(claimUUID, eventId)` is collision-safe: both args are fixed length
  (`bytes32`, `uint256`). Backend and contract must encode identically.

---

## Database schema (Prisma)

```prisma
enum EventMode { simple secure }

model Event {
  id                 String       @id @default(cuid())
  onchainEventId     BigInt       @unique          // tokenId == eventId
  name               String
  mode               EventMode    @default(simple)
  signerAddress      String
  encryptedSignerKey String                        // AES-256-GCM(privKey)
  startTime          DateTime
  endTime            DateTime
  maxSupply          Int
  metadataUri        String
  createdAt          DateTime     @default(now())
  claims             ClaimToken[]
}

model ClaimToken {
  id          String   @id @default(cuid())
  eventId     String
  claimUUID   String   @unique                     // bytes32 hex
  signature   String
  expiresAt   DateTime
  used        Boolean  @default(false)             // UX cache; on-chain is source of truth
  recipient   String?
  txHash      String?
  createdAt   DateTime @default(now())
  event       Event    @relation(fields: [eventId], references: [id])

  @@index([eventId])
  @@index([expiresAt])
}
```

> The DB `used`/TTL checks are a **UX optimization**, not a guarantee. Uniqueness is
> enforced on-chain by `usedClaims`.

---

## Contract interface (AttendanceNFT.sol)

```solidity
struct EventInfo {
    address signerAddress;
    uint64  startTime;
    uint64  endTime;
    uint32  maxSupply;
    uint32  minted;
    string  uri;
    // extensible: future fields (verified, category) add without breaking usedClaims
}

mapping(uint256 => EventInfo) public events;
mapping(bytes32 => bool)      public usedClaims;
address public owner;

function createEvent(uint256 eventId, address signerAddress, uint64 startTime,
                     uint64 endTime, uint32 maxSupply, string calldata uri) external onlyOwner;

function claim(uint256 eventId, bytes32 claimUUID, address recipient, bytes calldata signature) external;
//  within [startTime, endTime] · minted < maxSupply · !usedClaims[claimUUID]
//  recover EIP-191(keccak256(abi.encodePacked(claimUUID, eventId))) == signerAddress
//  usedClaims[claimUUID]=true; minted++; _mint(recipient, eventId, 1, "")

function uri(uint256 eventId) public view override returns (string memory);

event EventCreated(uint256 indexed eventId, address signerAddress, uint64 startTime, uint64 endTime, uint32 maxSupply);
event Claimed(uint256 indexed eventId, bytes32 indexed claimUUID, address indexed recipient);
```

> Not upgradeable in the MVP (avoids proxy complexity). The struct/events are designed
> so roadmap features (verified events, soulbound, on-chain levels) can be added by a
> new contract or new fields without migrating `usedClaims`.

---

## Two QR modes

| | SIMPLE | SECURE |
|--|--------|--------|
| Use case | small/informal events, printed stickers | larger events, shared display |
| Token | batch of static tokens with TTL | shared QR (`/e/{id}`), 1 badge per wallet |
| Carrier | PDF stickers / screen | one screen, on-chain `balanceOf` limit |
| Signature | `keccak256(abi.encodePacked(claimUUID, eventId))` + EIP-191 | same |

The contract does not distinguish modes — the difference is only how the backend issues
`claimUUID`s. On-chain protection (`usedClaims`, window, supply) is shared.

---

## Open decisions

1. Owner model — single admin (MVP) vs per-organizer factory (roadmap).
2. Badge image — auto-generated (satori/canvas) vs organizer upload. MVP: upload + default template.
3. Third-party contract audit before a public audience.
