# I Was Here

Proof-of-attendance NFT-приложение на Base. MVP: организатор создаёт событие, гость сканирует QR, подключает Base Account и получает ERC-1155 NFT-бейдж. Gasless claim идёт через CDP Paymaster.

## Current Status

Планирование завершено. Код приложения ещё не создан.

Следующий шаг: `SPRINT_00_DISCOVERY.md`.

## Core Docs

- `ARCHITECTURE.md` — архитектура и locked decisions.
- `ROADMAP.md` — post-MVP scope.
- `AGENTS.md` — правила для Claude/Codex.
- `EVALS.md` — обязательные проверки.
- `PROGRESS.md` — текущий статус.

## Prerequisites

- Node.js >= 20.9
- pnpm
- Foundry (`forge`, `cast`)
- Postgres
- CDP Paymaster account
- Pinata account
- Base Sepolia deployer wallet with test ETH

## Planned Structure

```text
web/        Next.js app, API routes, Prisma
contracts/  Foundry project, AttendanceNFT.sol
```

## Environment

Start from `.env.example`. Do not commit real `.env` files or secrets.

## Development Protocol

1. Work one sprint at a time.
2. Follow `AGENTS.md`.
3. Run relevant checks from `EVALS.md`.
4. Create `DONE_XX.md` after each sprint.
5. Update `PROGRESS.md`.

Mainnet deploy requires explicit human approval.
