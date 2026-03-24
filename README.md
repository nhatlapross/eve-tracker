# EVE Frontier — Industry & Resource Tracker

> **EVE Frontier × Sui Hackathon 2026** submission
> Deadline: March 31, 2026 · Prize pool: $80,000

A crowdsourced intelligence platform for EVE Frontier pilots. Interactive star map, on-chain resource sighting reports with peer verification, route planner, item browser, cargo calculator, and capsuleer leaderboard — all powered by real game data and Sui blockchain attestation.

---

## Features

### Interactive Star Map
- Renders **600+ real solar systems** from the EVE Frontier World API with constellation-based coloring
- Nebula backgrounds, animated starfield, scanline and vignette overlays
- Click any system → animated zoom-in → **3D star detail overlay** with orbital rings, corona glow, and live resource intel
- Clip-path reveal animation expanding from the clicked star's exact screen position
- Systems with sightings highlighted in orange with pulsing rings

### Route Planner
- Built into the Star Map — select two systems and find the shortest path via BFS
- Route highlighted on canvas with glowing green lines, pulsing node markers, and diamond indicators
- Autocomplete system name search via datalist
- Client-side pathfinding using the same proximity graph rendered on screen — every hop is visible

### Crowdsourced Resource Sightings + Sui On-Chain Signing
- Players report resource locations (system, item type, quantity, notes)
- **Wallet connected**: report is signed on Sui testnet as a `report_sighting` transaction
- **Wallet disconnected**: saved locally with option to sign later
- If the wallet rejects the transaction, the local draft is rolled back automatically
- Feed filtered by 24h / 7d / all time
- ON-CHAIN badge with Sui Explorer link on chain-signed reports

### Sighting Verification (On-Chain)
- Any connected wallet can **verify** a sighting ("I also see resource X at system Y")
- Calls `verify_sighting` on the Sui smart contract — creates a `Verification` object and emits `SightingVerified` event
- Verification count displayed per sighting — multiple independent confirmations = higher trust
- Trustless crowdsourced intel powered by blockchain attestation

### Capsuleer Leaderboard
- Top 20 resource scouts ranked by sighting count
- Gold / silver / bronze ranking for top 3
- Merges local + on-chain data with deduplication
- Shows: report count, on-chain count, top items scouted, last activity time
- ON-CHAIN badge for reporters with blockchain-signed contributions

### Resource Browser
- Full catalogue of **390+ item types** from the EVE Frontier API
- Filter by category, search by name
- Volume (m³) and mass (kg) specs for every item

### Industry Calculator (Bill of Materials)
- Multi-item cargo manifest — add/remove items with per-row volume and mass
- 5 ship class presets: Shuttle (50 m³) → Jump Freighter (300,000 m³)
- Ship comparison table with color-coded trip counts (green/yellow/orange)
- Custom cargo hold size input

### Dashboard Overview
- Animated count-up stat cards: solar systems, item types, tribes, sightings
- Navigation cards to all features
- Recent sighting activity feed
- Live API health indicator

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router, Server + Client Components) |
| UI | React 19 · Tailwind CSS v4 · Lucide Icons |
| Star Map | react-force-graph-2d (HTML5 Canvas) |
| Animations | Anime.js v4 (zoom, clip-path reveal, count-up, stagger) |
| Blockchain | Sui Move smart contract · @mysten/dapp-kit v4 · @mysten/sui |
| Data Source | EVE Frontier World REST API v2 (Stillness server) |
| Storage | File-based JSON (local sightings) + Sui testnet (on-chain) |
| Fonts | Exo 2 · Share Tech Mono (Google Fonts) |

---

## Sui Smart Contract

Sighting reports and verifications are stored on **Sui testnet** via a Move smart contract.

### Contract Details

| | |
|---|---|
| **Package** | `0x0d429eeb95cace6cf52085fd58cb3a7fa4a7c17e644fdc3c70bf29fbb69a5182` |
| **SightingRegistry** | `0x644a43926a894ac8abf5a3b4b78189f52703c7e547af18079a3162c8bf3e4efb` |
| **Network** | Sui Testnet |

### On-Chain Functions

**`report_sighting`** — Submit a new resource sighting
- Creates a `Sighting` object (owned by the reporter)
- Emits `SightingReported` event for off-chain indexing
- Increments registry total

**`verify_sighting`** — Verify an existing sighting
- Creates a `Verification` object (owned by the verifier)
- Emits `SightingVerified` event for trust aggregation
- Increments registry verification total

### Data Flow

```
User submits sighting form
  → POST /api/sightings (save local draft)
  → [Wallet connected?]
      ├─ YES → Build PTB → signAndExecuteTransaction → emit SightingReported event
      │         on success: mark as on-chain
      │         on reject: rollback local draft (DELETE)
      └─ NO  → save locally only

User clicks VERIFY on a sighting
  → Build PTB → verify_sighting(registry, clock, system_id, item_id, name)
  → emit SightingVerified event → update count in UI

Leaderboard / Sightings page
  → Query SightingReported + SightingVerified events from Sui RPC
  → Merge with local JSON → deduplicate → display
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Sui wallet browser extension (for on-chain features)

### Install & Run

```bash
git clone <repo>
cd tracker
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment

No environment variables required. The app connects directly to the EVE Frontier World API:

```
https://world-api-stillness.live.tech.evefrontier.com/v2
```

---

## Project Structure

```
app/
  page.tsx              # Dashboard overview (server component)
  map/page.tsx          # Interactive star map + route planner
  resources/page.tsx    # Item type browser
  calculator/page.tsx   # Multi-item cargo calculator
  sightings/page.tsx    # Sighting feed + report form + verify
  leaderboard/page.tsx  # Capsuleer rankings (server component)
  api/
    systems/            # GET /api/systems?limit=N
    sightings/          # GET | POST | DELETE /api/sightings
    types/              # GET /api/types
    tribes/             # GET /api/tribes
    route/              # GET /api/route?from=ID&to=ID (BFS pathfinding)
    leaderboard/        # GET /api/leaderboard (aggregated rankings)
    verifications/      # GET /api/verifications (on-chain verify counts)

components/
  eve-nav.tsx           # Navigation bar with wallet connect
  star-detail.tsx       # 3D star overlay with Anime.js animations
  stat-cards.tsx        # Animated dashboard stat cards
  wallet-button.tsx     # Sui wallet connect/disconnect dropdown
  sui-provider.tsx      # Sui + React Query providers

lib/
  eve-api.ts            # EVE Frontier World API client
  sightings-store.ts    # File-based sighting storage (JSON)
  sui-config.ts         # Sui package + registry IDs
  sui-client.ts         # Sui RPC client wrapper

sightings_contract/
  sources/sightings.move  # Sui Move smart contract
  Move.toml               # Move package config
```

---

## Hackathon Context

**Problem**: EVE Frontier is a hardcore sandbox MMO where resource intelligence is the difference between profit and loss. The game has no built-in tool for sharing resource sighting data across the playerbase. Players hoard information or rely on fragmented Discord messages.

**Solution**: This platform provides:

1. **Spatial context** — the star map lets players visualize where resources have been spotted relative to their position, with route planning to get there
2. **Trustless crowdsourced intel** — sighting reports are signed on Sui blockchain; peer verification builds community trust without a central authority
3. **Industry tools** — item browser and multi-item cargo calculator to plan logistics without leaving the browser
4. **Competitive reputation** — the leaderboard incentivizes high-quality reporting by surfacing top contributors

### Why Sui?

- **Owned objects**: Each sighting and verification is owned by the reporter/verifier — true data ownership
- **Events for indexing**: `SightingReported` and `SightingVerified` events enable efficient off-chain aggregation
- **Shared registry**: The `SightingRegistry` tracks global totals without requiring central infrastructure
- **Composability**: Other builders can build on top of the sighting data (market tools, alert bots, alliance dashboards)

---

## License

MIT
