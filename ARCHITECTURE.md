# ARCHITECTURE.md — "I Was Here"

Proof-of-attendance NFT-приложение на Base. Гость получает NFT-бейдж посещения с надписью события и коллекционирует их в кошельке. ERC-1155, gasless-клейм через CDP Paymaster + Base Account (Coinbase Smart Wallet). MVP на Base Sepolia.

> Источники, сверенные с официальной докой Base (docs.base.org):
> - Gasless = **ERC-7677 + EIP-5792** (`wallet_sendCalls` + capability `paymasterService.url`).
> - CDP Paymaster URL **проксируется** через бэкенд, не светится на фронте.
> - Стек wallet: **wagmi v2 + viem + Base Account connector** (`@base-org/account`); OnchainKit — UI-обёртка поверх.
> - Base Sepolia: chainId **84532** (`0x14A34`), RPC `https://sepolia.base.org`, explorer `https://sepolia-explorer.base.org`. Mainnet — **8453**.

---

## 0. Locked Decisions (зафиксировано до кода)

| # | Решение |
|---|---------|
| Хранение ключей | env + **AES-256-GCM** для MVP → **CDP KMS** перед mainnet |
| Содержимое QR | только короткий **token** (`/claim/{token}`), полный payload в БД |
| Формат подписи | **EIP-191** (`toEthSignedMessageHash`) везде. Payload: `keccak256(abi.encodePacked(claimUUID, eventId))` |
| Frontrun (простой режим) | принят для MVP + **TTL claim-токена 30 мин** в БД. Recipient-binding отложен post-MVP |
| Paymaster исчерпан | **блок клейма** с понятным сообщением. Алерт организатору при 20% баланса. **Без тихого фолбэка на газ юзера** |
| Защищённый режим QR | **ротирующийся QR** (TOTP-style, ~15с) на экране организатора |
| Уровни/геймификация | **off-chain** расчёт по числу NFT в кошельке (MVP). On-chain — post-MVP |
| Скоуп | MVP узкий (2 режима QR + NFT-бейдж с надписью + коллекция). Остальное — `ROADMAP.md`. Контракт проектируем **extensible** сразу |

---

## 1. Tech Stack Decision

| Слой | Выбор | Почему |
|------|-------|--------|
| Frontend | `create-next-app@latest`, App Router, Node ≥ 20.9 | Стандарт, SSR/API routes, Vercel-нативно. |
| Wallet (основа) | **wagmi v2 + viem + Base Account connector** (`@base-org/account`) | Доку Base: gasless требует `wallet_sendCalls` (EIP-5792) с capability `paymasterService`. |
| Wallet (UI) | **OnchainKit** (опционально) | Готовые компоненты Connect/Identity поверх wagmi. |
| Контракты | **Foundry** | Быстрые тесты, fuzzing, скрипты деплоя. |
| База данных | **Postgres + Prisma** | Типобезопасные миграции, индексы на FK. |
| QR-генерация | `qrcode` (npm) | PNG/SVG/dataURL. |
| PDF (стикеры) | `pdfkit` | Лист стикеров для простого режима. |
| IPFS/метаданные | **Pinata** (MVP), локальный JSON fallback | metadata.json для `uri()`. |
| Paymaster | **CDP Paymaster** (ERC-7677) | Спонсирует UserOp Smart Account-а гостя. URL проксируется. |
| Деплой | **Vercel**, Base Sepolia → Mainnet | Vercel-нативный Next.js. |

**Почему НЕ наивный backend-relayer:** если backend зовёт `claim()`, `msg.sender = relayer`. Без явного `recipient` NFT уйдёт релееру. Поэтому: (а) контракт минтит в `recipient`; (б) tx шлёт Smart Account гостя через `wallet_sendCalls`, газ спонсирует Paymaster.

**Критичная деталь хеширования (скилл nodejs-keccak256):** подпись на бэкенде через `viem`/`ethers` `keccak256`, **никогда** `crypto.createHash('sha3-256')` (NIST-SHA3 ≠ Keccak, `ecrecover` не сойдётся).

---

## 2. System Diagram (ASCII)

```
                         ┌─────────────────────────────────────────┐
                         │           ОРГАНИЗАТОР (браузер)           │
                         │  /organizer dashboard                     │
                         │  - создать событие (mode: simple|secure)  │
                         │  - secure: экран "режим входа" (rotating)  │
                         └───────────────┬───────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Next.js API routes)                          │
│  /api/events            создаёт event (+mode): keypair (viem)                  │
│                         priv → AES-256-GCM → DB; pub-addr → on-chain           │
│  /api/events/[id]/qr    SIMPLE: пачка claim-токенов (TTL 30мин) + PDF          │
│  /api/events/[id]/live  SECURE: ротирующийся token каждые ~15с (TTL ~30с)      │
│  /api/claim?token=      отдаёт {eventId, claimUUID, signature}                 │
│  /api/paymaster (proxy) проксирует CDP Paymaster URL (скрыт)                   │
│   ┌──────────────┐        ┌──────────────────────────────────────────┐        │
│   │  Postgres    │◄──────►│  Master key (env) AES-шифрует priv-keys    │        │
│   └──────────────┘        └──────────────────────────────────────────┘        │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                         │
        ┌────────────────────────────────┘
        │ гость сканит QR → /claim/{token}
        ▼
┌─────────────────────────────────────────┐        ┌──────────────────────────────┐
│         ГОСТЬ (мобильный браузер)         │        │       CDP Paymaster          │
│  wagmi + Base Account connector           │◄──────►│  спонсирует газ UserOp       │
│  connect/create Smart Wallet              │        │  (исчерпан → блок клейма)    │
│  wallet_sendCalls(claim, paymaster)       │        └──────────────┬───────────────┘
└───────────────────┬───────────────────────┘                       │
                    │ UserOp (sender = Smart Account гостя)           ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │                  Base Sepolia (chainId 84532)                      │
        │  AttendanceNFT.sol (ERC-1155, extensible)                          │
        │  claim(eventId, claimUUID, recipient, signature):                  │
        │    ecrecover(EIP191(keccak256(packed(uuid,eventId))))==signer      │
        │    !usedClaims[claimUUID] · now in window · minted<maxSupply        │
        │    _mint(recipient, eventId, 1, "")   ← в recipient, НЕ msg.sender  │
        └──────────────────────────────────────────────────────────────────┘

   off-chain уровни: фронт читает balanceOf по eventId-ам → счёт коллекции → уровень
```

---

## 3. Components & Responsibilities

| Компонент | Ответственность |
|-----------|------------------|
| **Next.js frontend** | `/organizer`, `/claim/[token]`, `/collection` (бейджи гостя + уровень). |
| **API routes** | События (+mode), генерация QR (simple/secure), PDF, claim-данные, прокси Paymaster, алерт бюджета. |
| **Postgres (Prisma)** | События (с `mode`), claim-токены (с TTL), счётчики, paymaster-бюджет. Шифротекст priv-key. |
| **Crypto-сервис** | Keypair (viem), AES-256-GCM, подпись `keccak256(abi.encodePacked(claimUUID, eventId))` + EIP-191. |
| **Rotating-token сервис** | SECURE-режим: выдаёт короткоживущие claim-токены пачкой по таймеру для live-экрана. |
| **AttendanceNFT.sol** | ERC-1155, extensible. Источник истины: подпись, дубли, окно, supply. Минт в `recipient`. |
| **CDP Paymaster** | Спонсирует газ. URL проксируется. При исчерпании → блок (не тихий фолбэк). |
| **Pinata** | metadata.json (бейдж с надписью события) для `uri(tokenId)`. |

---

## 4. Data Flow (организатор → минт)

1. Организатор на `/organizer` создаёт событие: название, время, maxSupply, картинка, **mode: `simple` | `secure`**.
2. `POST /api/events`: keypair (viem) → priv AES-256-GCM → `Event.encryptedSignerKey`; on-chain `createEvent(...)` с `signerAddress`/окном/supply/uri; metadata (бейдж с надписью) → Pinata.
3. Генерация claim-токенов — **зависит от mode**:
   - **SIMPLE:** `POST /api/events/[id]/qr?count=N` → пачка `ClaimToken` (uuid, подпись, `expiresAt = now+30мин`), PDF-лист стикеров (`pdfkit`).
   - **SECURE:** организатор открывает live-экран `/organizer/[id]/live` → `/api/events/[id]/live` отдаёт **один ротирующийся token каждые ~15с** (`expiresAt = now+~30с`, `used` помечается мгновенно при клейме). QR на экране обновляется.
4. Гость сканирует QR → `/claim/{token}`.
5. Фронт подключает/создаёт Base Account → `recipient = address`.
6. `GET /api/claim?token=...` → `{ eventId, claimUUID, signature }` (+ проверка TTL/used в БД = UX-фильтр).
7. Фронт зовёт `wallet_sendCalls` → `claim(eventId, claimUUID, recipient, signature)` + capability `paymasterService.url = /api/paymaster`.
8. UserOp (sender = Smart Account гостя), газ спонсирует Paymaster. Если бюджет исчерпан → блок с сообщением.
9. Контракт проверяет → `_mint(recipient, eventId, 1, "")`, эмит `Claimed`.
10. Backend метит `ClaimToken.used=true`. Фронт `/collection` показывает новый бейдж + пересчитывает off-chain уровень.

---

## 5. Signing Key Lifecycle

```
Создание события
   └─> viem generatePrivateKey() → privKey
          ├─> privateKeyToAccount(privKey).address ──> on-chain Event.signerAddress
          └─> AES-256-GCM(privKey, MASTER_KEY) ──> DB Event.encryptedSignerKey

Генерация QR (подпись)
   └─> decrypt privKey
          └─> h = keccak256(abi.encodePacked(claimUUID, eventId))   ← viem, НЕ sha3-256
                 └─> sig = signMessage({raw: h})  → EIP-191        ← кладётся в ClaimToken

Проверка (on-chain)
   └─> ecrecover(toEthSignedMessageHash(h), sig) == Event.signerAddress
```

- Приват-ключ **никогда** не уходит на фронт.
- MVP: мастер-ключ в env (`SIGNER_MASTER_KEY`). **Перед mainnet — переход на CDP KMS** (Locked #1).
- `abi.encodePacked(claimUUID, eventId)` безопасен: оба аргумента фикс-длины (`bytes32`, `uint256`) → нет коллизий упаковки. Бэкенд и контракт обязаны кодировать идентично.

---

## 6. Gasless Flow (ERC-7677 / EIP-5792)

1. Гость на `/claim/{token}` подключает Base Account.
2. `wallet_getCapabilities(address)` → проверка `paymasterService.supported` для chainId 84532.
3. `encodeFunctionData(claim, ...)` (viem).
4. `wallet_sendCalls({ calls:[...], capabilities:{ paymasterService:{ url: NEXT_PUBLIC_PAYMASTER_PROXY_URL } } })` — URL = наш `/api/paymaster` (реальный CDP скрыт в env).
5. Base Account строит UserOp, идёт к Paymaster за спонсорством.
6. Спонсируется → UI «gas sponsored». **Бюджет исчерпан → блок клейма с сообщением** (Locked #5), без фолбэка на газ юзера.
7. `sender` UserOp = Smart Account гостя; контракт всё равно минтит в `recipient`.
8. NFT у гостя, газ оплатил Paymaster. Backend инкрементит счётчик бюджета; при ≤20% — алерт организатору.

---

## 7. Database Schema Overview (Prisma)

```prisma
enum EventMode { simple secure }

model Event {
  id                 String       @id @default(cuid())
  onchainEventId     BigInt       @unique          // tokenId == eventId
  name               String
  mode               EventMode    @default(simple)
  signerAddress      String
  encryptedSignerKey String                        // AES-256-GCM(privKey) base64(iv|tag|ct)
  startTime          DateTime
  endTime            DateTime
  maxSupply          Int
  metadataUri        String                        // бейдж с надписью события
  paymasterSpent     Int          @default(0)      // спонсированные клеймы (бюджет)
  paymasterBudget    Int?                           // лимит, для алерта 20%
  createdAt          DateTime     @default(now())
  claims             ClaimToken[]
}

model ClaimToken {
  id          String   @id @default(cuid())
  eventId     String
  claimUUID   String   @unique                     // bytes32 hex
  signature   String
  expiresAt   DateTime                             // simple: +30мин; secure: +~30с
  used        Boolean  @default(false)             // UX-кэш; on-chain = истина
  recipient   String?
  txHash      String?
  createdAt   DateTime @default(now())
  event       Event    @relation(fields: [eventId], references: [id])

  @@index([eventId])                               // FK-индекс
  @@index([expiresAt])                             // для очистки протухших
}
```

> Дубль-проверка и TTL в БД — **UX-оптимизация**, не гарантия. Гарантия дублей — `usedClaims` on-chain.

---

## 8. Contract Interface (AttendanceNFT.sol) — extensible

### Структура
```solidity
struct EventInfo {
    address signerAddress;
    uint64  startTime;
    uint64  endTime;
    uint32  maxSupply;
    uint32  minted;
    string  uri;          // бейдж-метаданные
    // extensible: будущие поля (verified, category) добавляются без слома usedClaims
}
```

### State
```solidity
mapping(uint256 => EventInfo) public events;
mapping(bytes32 => bool)      public usedClaims;
address public owner;
```

### Functions
```solidity
function createEvent(uint256 eventId, address signerAddress, uint64 startTime,
                     uint64 endTime, uint32 maxSupply, string calldata uri) external onlyOwner;

function claim(uint256 eventId, bytes32 claimUUID, address recipient, bytes calldata signature) external;
//  require(now >= startTime && now <= endTime)
//  require(minted < maxSupply)
//  require(!usedClaims[claimUUID])
//  bytes32 h = keccak256(abi.encodePacked(claimUUID, eventId))
//  bytes32 eth = toEthSignedMessageHash(h)            // EIP-191
//  address rec = ECDSA.recover(eth, signature)
//  require(rec != address(0) && rec == event.signerAddress)
//  usedClaims[claimUUID]=true; minted++; _mint(recipient, eventId, 1, "")

function uri(uint256 eventId) public view override returns (string memory);
```

### Events
```solidity
event EventCreated(uint256 indexed eventId, address signerAddress, uint64 startTime, uint64 endTime, uint32 maxSupply);
event Claimed(uint256 indexed eventId, bytes32 indexed claimUUID, address indexed recipient);
```

> **Extensible**: не делаем upgradeable-проксю в MVP (лишняя сложность), но структуру/события проектируем так, чтобы post-MVP фичи (verified events, soulbound, on-chain levels) добавлялись новым контрактом или новыми полями без миграции `usedClaims`. Зафиксировать формат подписи round-trip backend↔контракт в Спринте 02.

---

## 9. NFT Badge Metadata (бейдж с надписью)

ERC-1155 `uri(eventId)` → JSON на Pinata:
```json
{
  "name": "I Was Here — <Название события>",
  "description": "Proof of attendance: <событие>, <дата>.",
  "image": "ipfs://<CID картинки бейджа>",
  "attributes": [
    { "trait_type": "Event", "value": "<название>" },
    { "trait_type": "Date", "value": "<ISO>" },
    { "trait_type": "Mode", "value": "simple|secure" }
  ]
}
```
- Картинка бейджа несёт **надпись события** (генерится при создании или загружается организатором).
- Коллекция в кошельке = набор бейджей разных событий. Off-chain уровень считается по их количеству.

---

## 10. Two QR Modes

| | SIMPLE | SECURE (rotating) |
|--|--------|-------------------|
| Кейс | малые/неформальные ивенты, печатные стикеры | массовые ивенты, защита от репоста QR |
| Токен | пачка статичных, TTL 30мин | один ротирующийся, TTL ~30с, меняется ~15с |
| Носитель | PDF-стикеры / экран | live-экран организатора |
| Защита от репоста | слабая (frontrun принят) | сильная (QR протухает до репоста) |
| Подпись | одинаковая: `keccak256(abi.encodePacked(claimUUID, eventId))` + EIP-191 | та же |

Контракт **не различает** режимы — разница только в том, как backend выдаёт `claimUUID` и какой TTL. On-chain защита (usedClaims/окно/supply) общая.

---

## 11. Open Decisions (остаток, не блокируют старт)

1. **CDP KMS детали** — конкретный сервис/ключ-менеджмент перед mainnet (Спринт 06).
2. **Owner-модель** — один админ для всех событий (MVP) vs фабрика на организатора (post-MVP).
3. **Картинка бейджа** — авто-генерация надписи (canvas/satori) vs загрузка организатором. MVP: загрузка + дефолт-шаблон.
4. **Secure live-экран** — нужен ли отдельный «kiosk»-режим/auth для экрана входа.
5. **Аудит контракта** сторонним до mainnet с реальной аудиторией.

См. также `ROADMAP.md` — post-MVP фичи (уровни on-chain, верификация оргов, проект-бейджи, recipient-binding).
