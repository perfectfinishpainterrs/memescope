# MEMESCOPE

**Wallet Scanner + Scam Detector + X/Twitter Research for Meme Coins**

A research-first meme coin terminal that scans wallets, analyzes token safety, tracks holder trends, and integrates Twitter/X sentiment — all in one place.

Unlike trading terminals (Padre, BullX, Axiom) that focus on execution, Memescope focuses on **research and risk assessment** before you trade.

---

## Features

### 🔍 Wallet Scanner
- Paste any wallet address → see all holdings and positions
- Average entry price, PNL, buy/sell history per token
- Transaction timeline with amounts and prices

### 📊 Token Monitor
- Holder count with trend chart (growing vs declining)
- Holder inflow/outflow (new holders vs leaving)
- Holder distribution (whale/large/medium/small breakdown)
- Buy/sell volume analysis
- Whale movement tracking

### 🛡️ Scam Scanner
- Safety score 0-100 (SAFE / CAUTION / DANGER)
- Honeypot detection (simulate sell)
- LP lock status and duration
- Mint/freeze authority check
- Dev wallet % and selling activity
- Buy/sell tax detection
- Blacklist function detection
- Deployer history (linked rugs)
- Contract renounced check

### 🐦 X/Twitter Research (Phase 2)
- Search X for token sentiment
- KOL tracker (monitor influencer calls)
- AI-powered research briefings via Claude

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth + Wallet Connect |
| Solana | Helius API + @solana/web3.js |
| EVM | Moralis + ethers.js |
| Token Data | DEXScreener + Birdeye + GeckoTerminal |
| Scam Detection | GoPlus API + custom checks |
| Twitter | X API v2 |
| AI | Anthropic Claude API |
| Hosting | Vercel |

---

## Project Structure

```
memescope/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing / home
│   │   ├── dashboard/          # Main dashboard page
│   │   ├── scan/               # Wallet scan page
│   │   └── api/                # API routes
│   │       ├── wallet/
│   │       │   ├── scan/       # POST — scan a wallet address
│   │       │   └── positions/  # GET — wallet positions
│   │       ├── token/
│   │       │   ├── holders/    # GET — holder data + trend
│   │       │   └── safety/     # GET — scam scan results
│   │       ├── twitter/
│   │       │   ├── search/     # POST — search X for token
│   │       │   └── sentiment/  # GET — sentiment score
│   │       └── research/       # POST — AI research briefing
│   │
│   ├── components/
│   │   ├── ui/                 # Generic UI (buttons, cards, badges)
│   │   ├── charts/             # Chart components (price, holders, volume)
│   │   ├── wallet/             # Wallet scanner UI
│   │   ├── token/              # Token detail panels
│   │   ├── scam/               # Scam scanner UI
│   │   ├── twitter/            # Twitter feed & KOL tracker
│   │   └── layout/             # Header, sidebar, nav
│   │
│   ├── lib/
│   │   ├── blockchain/
│   │   │   ├── solana/         # Solana RPC, Helius, token parsing
│   │   │   └── evm/            # EVM RPC, Moralis, contract reads
│   │   ├── services/           # Business logic services
│   │   ├── scoring/            # Safety score algorithm
│   │   ├── twitter/            # X API client & query builder
│   │   ├── ai/                 # Claude API integration
│   │   ├── db/                 # Supabase client & queries
│   │   └── utils/              # Formatters, helpers
│   │
│   ├── hooks/                  # React hooks
│   ├── types/                  # TypeScript types
│   ├── config/                 # App config, constants
│   └── styles/                 # Global styles
│
├── docs/                       # Documentation
├── scripts/                    # Dev scripts, seed data
├── tests/                      # Tests
├── .env.example                # Environment variables template
├── next.config.ts              # Next.js config
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/memescope.git
cd memescope
pnpm install
```

### 2. Set up environment
```bash
cp .env.example .env.local
# Fill in your API keys (see .env.example for details)
```

### 3. Run dev server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

See `.env.example` for the full list. At minimum you need:

```
HELIUS_API_KEY=           # Solana RPC + token data
NEXT_PUBLIC_SUPABASE_URL= # Database
SUPABASE_SERVICE_KEY=     # Database (server-side)
```

Optional (enable more features):
```
DEXSCREENER_API_KEY=      # Token prices (free, no key needed)
BIRDEYE_API_KEY=          # Solana token analytics
GOPLUS_API_KEY=           # Scam detection
X_BEARER_TOKEN=           # Twitter/X research
ANTHROPIC_API_KEY=        # AI research briefings
MORALIS_API_KEY=          # EVM chain data
```

---

## Development Phases

- [x] Phase 0: Project structure + design mockups
- [ ] Phase 1: Foundation (Next.js, Supabase, auth)
- [ ] Phase 2: Wallet scanner (Solana first)
- [ ] Phase 3: Token data + holder tracking
- [ ] Phase 4: Scam scanner
- [ ] Phase 5: X/Twitter integration
- [ ] Phase 6: AI research briefings
- [ ] Phase 7: Alerts + real-time updates
- [ ] Phase 8: EVM chain support
- [ ] Phase 9: Polish + launch

---

## License

MIT
