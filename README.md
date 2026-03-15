# MEMESCOPE

**Solana Meme Coin Research Terminal**

A research-first meme coin terminal that scans wallets, analyzes token safety, tracks portfolios with AI-powered trade analysis, and integrates Twitter/X sentiment — all in one place.

Unlike trading terminals (Padre, BullX, Axiom) that focus on execution, Memescope focuses on **research, portfolio intelligence, and risk assessment**.

---

## Features

### Portfolio Tracker
- Connect Phantom/Solflare wallet — auto-authenticates via signature
- Real-time holdings with prices, 24h change, allocation pie chart
- Full trade history from Helius parsed transactions (supports pump.fun, Padre/Terminal, Jupiter, Raydium)
- **Token Breakdown** — per-token cost basis, realized PnL, unrealized PnL, status (HODL/CLOSED/PARTIAL)
- **Win Rate** — % of tokens traded profitably
- **Best/Worst Trade** — highlights biggest W and L
- **Average Hold Time** — flip speed across closed positions
- Trade Volume + Trade Activity charts
- PnL by Token chart

### AI Trade Analyzer
- Claude-powered portfolio analysis (auth required, 10/day limit)
- Portfolio grade, PnL breakdown, trading pattern detection
- Per-token "What do?" AI verdicts
- Meme coin aware — practical advice, not doom and gloom

### Token Research
- AI research briefings with market data, holder analysis, sentiment
- Safety score 0-100 (LP lock, honeypot, mint/freeze authority, deployer history)
- Holder count, concentration, whale tracking
- Meteora DLMM pool data (TVL, volume, fees, APR)
- Order book sniffer — analyzes last 100 swaps for suspicious activity

### Wallet Scanner
- Paste any wallet → see all holdings and positions
- Transaction timeline with amounts and prices

### X/Twitter Sentiment
- Grok-powered X search for token sentiment
- KOL tracker (monitor influencer calls)
- Bullish/bearish sentiment scoring

---

## Security

- **Wallet auth** — Ed25519 signature verification, 5-min expiry, auto Supabase session
- **AI rate limiting** — 10 AI calls/day per authenticated user
- **API keys server-side** — Anthropic, Grok, Birdeye, Moralis keys never exposed to browser
- **Auth-gated AI routes** — `/api/portfolio/analyze`, `/api/token/research`, `/api/token/sentiment`
- **CoinGecko proxied** — `/api/prices` avoids CORS and rate limits
- **Rate limiting** — per-IP with localhost bypass for dev

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Database | Supabase (Postgres + Auth) |
| Auth | Wallet signature + Supabase sessions |
| Solana | Helius API (parsed transactions) + @solana/web3.js |
| EVM | Moralis + ethers.js |
| Token Data | DEXScreener + Birdeye + GeckoTerminal + Meteora |
| Scam Detection | GoPlus API + Jupiter sell simulation + custom checks |
| Twitter | Grok API (X search) + X API v2 fallback |
| AI | Anthropic Claude (Sonnet) |
| Wallet | Solana Wallet Adapter (Phantom, Solflare) |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/memescope.git
cd memescope
npm install
```

### 2. Set up environment
```bash
cp .env.example .env.local
# Fill in your API keys (see below)
```

### 3. Run dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Required:
```
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=    # Supabase service role (server-side)
HELIUS_API_KEY=               # Solana RPC + parsed transactions
HELIUS_RPC_URL=               # Helius RPC endpoint
```

Optional (enable more features):
```
ANTHROPIC_API_KEY=            # AI trade analysis + research
GROK_API_KEY=                 # Twitter/X sentiment via Grok
BIRDEYE_API_KEY=              # Solana token analytics
MORALIS_API_KEY=              # Wallet tokens + EVM data
X_BEARER_TOKEN=               # Direct X API v2 (fallback)
GOPLUS_API_KEY=               # Scam detection
CRON_SECRET=                  # Vercel cron auth
```

---

## API Routes

### Public (no auth)
- `GET /api/portfolio?wallet=` — wallet holdings + SOL balance
- `GET /api/portfolio/transactions?wallet=` — swap history via Helius
- `GET /api/token/data?address=` — token price/volume/liquidity
- `GET /api/token/holders?address=` — holder count + top holders
- `GET /api/token/safety?address=` — safety score
- `GET /api/token/orderbook?address=` — recent swap analysis
- `GET /api/wallet/scan?address=` — wallet scan
- `GET /api/prices` — BTC/ETH/SOL prices (CoinGecko proxy)

### Auth Required (wallet signature)
- `POST /api/portfolio/analyze` — AI trade analysis (10/day)
- `POST /api/token/research` — AI token research (10/day)
- `GET /api/token/sentiment` — Twitter sentiment (10/day)
- `POST /api/auth/wallet` — wallet signature auth

### User Data (auth required)
- `GET/POST /api/user/wallets` — saved wallets
- `GET/POST /api/user/watchlist` — token watchlist
- `GET/POST /api/user/alert` — price alerts
- `GET/POST /api/user/saved-tokens` — saved tokens
- `GET/POST /api/user/token-notes` — token notes

---

## License

MIT
