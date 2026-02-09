# Implementation Guide

## What's Built

### ✅ Done (Project Structure)
- Full Next.js 14 project with App Router
- TypeScript types for all data models
- API routes scaffolded (wallet scan, token safety, holders)
- Solana blockchain service (Helius API for wallet scan, tx parsing, mint info)
- Token data aggregator (DEXScreener + Birdeye + GeckoTerminal)
- Safety scoring algorithm (weighted scoring system)
- Twitter/X service (search, sentiment classification, query decomposition)
- AI research service (Claude API + web search)
- Supabase database schema (wallets, scans, holder snapshots, safety cache, KOL calls)
- UI components scaffolded (header, wallet search, position tabs)
- Tailwind config with custom terminal theme
- Config file with chains, safety weights, API URLs, KOL list

### 🔧 What's Scaffolded but Needs Implementation
- `src/lib/scoring/safety.ts` → LP lock detection, honeypot simulation, deployer tracing
- `src/lib/blockchain/evm/` → EVM chain support (Phase 8)
- Component UI → Connect the mockup (wallet-scanner-v3.jsx) to real components

---

## Next Steps (in order)

### 1. Connect the Mockup to Components
The visual mockup is in `wallet-scanner-v3.jsx` (the artifact).
Break it into these components:

```
src/components/
├── wallet/
│   ├── wallet-search.tsx       ✅ Done
│   ├── wallet-overview.tsx     → Port stats bar from mockup
│   └── position-tabs.tsx       → Port clickable token tabs
├── token/
│   ├── token-detail.tsx        → Main wrapper, renders all panels below
│   ├── token-header.tsx        → Name + holder count + safety ring
│   └── position-cards.tsx      → Invested, Value, PNL, Volume, Txns
├── charts/
│   ├── price-chart.tsx         → Area chart with entry dots
│   ├── holder-trend-chart.tsx  → Area chart (blue up / red down)
│   ├── holder-flow-chart.tsx   → Bar chart (inflow vs outflow)
│   ├── volume-chart.tsx        → Bar chart (buys vs sells)
│   └── holder-pie.tsx          → Pie chart + legend
├── scam/
│   ├── scam-scanner.tsx        → Full scam panel
│   ├── safety-ring.tsx         → SVG score ring
│   ├── check-row.tsx           → ✅/❌ check item
│   └── flag-list.tsx           → Red flags + positives
└── wallet/
    └── entry-ladder.tsx        → Buy/sell entry visualization
```

### 2. Wire Up Real Solana Data
Get a Helius API key and test:
```bash
# Test wallet scan
curl -X POST http://localhost:3000/api/wallet/scan \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_SOL_WALLET","chain":"SOL"}'
```

### 3. Implement Holder Snapshots
Create a Vercel cron job or Supabase Edge Function that:
- Runs every hour
- For each tracked token, fetches holder count
- Inserts into `holder_snapshots` table
- This builds the holder trend chart data over time

### 4. Implement LP Lock Detection
In `src/lib/scoring/safety.ts`:
- Fetch LP token account for the pair
- Check if LP tokens are in a known lock contract address
- Parse lock duration from account data

### 5. Implement Honeypot Simulation
Use Jupiter Quote API:
```
GET https://quote-api.jup.ag/v6/quote?inputMint=TOKEN&outputMint=SOL&amount=1000000
```
If the quote fails or returns 0 → honeypot.
Compare expected vs actual output → tax detection.

---

## API Keys Needed

| Priority | Service | Purpose | Cost |
|----------|---------|---------|------|
| 🔴 NOW | Helius | Solana RPC + wallet scan | $0-50/mo |
| 🟡 SOON | Supabase | Database | Free |
| 🟡 SOON | DEXScreener | Token prices | Free |
| 🟢 LATER | Birdeye | Enhanced Solana data | Free-$50 |
| 🟢 LATER | GoPlus | Scam detection | Free |
| 🔵 PHASE 5 | X API | Twitter research | $100/mo |
| 🔵 PHASE 6 | Anthropic | AI briefings | $50-200/mo |
