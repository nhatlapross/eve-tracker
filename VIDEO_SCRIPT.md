# EVE Frontier Tracker — Video Demo Script (~2:30)

---

## Opening (8s)
**Screen**: Dashboard — stat cards đang count-up animation
**Say**: "This is EVE Frontier Tracker — a crowdsourced intelligence platform for EVE Frontier pilots, powered by real game data and Sui blockchain."

---

## 1. Dashboard (12s)
**Screen**: Để animation count-up chạy hết → scroll qua nav cards
**Say**: "The dashboard pulls live data directly from the EVE Frontier World API — 24,000 solar systems, 392 item types, 101 tribes. All real game data."

**Action**: Scroll qua 8 nav cards một lượt → cho thấy scope của tool.

---

## 2. Star Map + Route Planner (35s)
**Screen**: Click "Star Map"
**Say**: "The Star Map renders 600 solar systems with constellation-based coloring and animated starfield."

**Action**: Zoom vào một cụm sao.

**Action**: Click vào 1 system có sightings (system màu cam) → clip-path reveal animation.
**Say**: "Click any system to see its coordinates and resource sightings reported by the community."

**Action**: Đóng detail → focus Route Planner panel góc dưới trái.
**Say**: "The built-in Route Planner finds the shortest path between any two systems using the same proximity graph on screen."

**Action**: Nhập FROM và TO → FIND ROUTE → show đường xanh glowing trên map.
**Say**: "Every hop is visible — no black boxes."

**Action**: Click CLEAR.

---

## 3. System Explorer (20s)
**Screen**: Navigate to "Systems"
**Say**: "The Star Map shows 600 systems — but the game has 24,502. System Explorer lets you search any of them."

**Action**: Gõ tên 1 system → click vào kết quả.
**Say**: "You get real 3D coordinates from the API, constellation, and the 8 nearest systems by actual distance in light years."

**Action**: Click vào 1 system lân cận → detail cập nhật.
**Say**: "Navigable — click any neighbor to jump to it."

---

## 4. Intel Feed (15s)
**Screen**: Navigate to "Intel Feed"
**Say**: "The Intel Feed is a live merged stream of every sighting report and on-chain verification across the cluster."

**Action**: Scroll qua feed, chỉ vào REPORT và VERIFY badges, ON-CHAIN badges.
**Say**: "On-chain events link directly to Sui Explorer — every entry is publicly auditable."

---

## 5. Resource Sightings + Sui Signing (30s)
**Screen**: Navigate to "Sightings"
**Say**: "Players report resource locations through the Sightings page."

**Action**: Click "Report Sighting" → fill form (system, item, quantity).
**Say**: "With a Sui wallet connected, the report is signed on-chain via a Move smart contract — not just saved to a database."

**Action**: Submit → wallet popup → sign → show ON-CHAIN badge + Sui Explorer link.
**Say**: "The transaction is recorded on Sui testnet. Immutable, publicly verifiable."

**Action**: Chỉ vào VERIFY button trên sighting khác.
**Say**: "Any pilot can independently verify a sighting on-chain. Multiple verifications build trust without a central authority — this is the core blockchain value prop."

**Action**: Click VERIFY → sign → show updated verification count.

---

## 6. Supporting Tools (20s)
**Screen**: Navigate to "Tribes"
**Say**: "The Tribes Directory shows all 101 tribes from the EVE API with real tax rates — useful for choosing where to operate."

**Action**: Scroll qua bảng 2–3 giây → navigate to "Calculator".
**Say**: "The Industry Calculator handles multi-item cargo planning with ship class comparison."

**Action**: Add 2 items → show ship comparison table → navigate to "Leaderboard".
**Say**: "The Leaderboard ranks top resource scouts by on-chain contributions — incentivizing quality reporting."

**Action**: Show top 3 với gold/silver/bronze badges, ON-CHAIN badges.

---

## Closing (10s)
**Screen**: Back to Dashboard
**Say**: "EVE Frontier Tracker — real game data, interactive visualization, and trustless crowdsourced intelligence on Sui. Try it live at eve-tracker-vert.vercel.app."

---

## Tips for Recording

- **Resolution**: 1920×1080 fullscreen, dark browser theme, bookmark bar hidden
- **Wallet**: Kết nối Sui wallet trước khi record, có sẵn SUI testnet tokens
- **Seed data**: Tạo sẵn 3–5 sightings và 2–3 verifications trước khi quay
- **Pace**: Đừng vội — để animation clip-path, count-up, zoom chạy hết
- **Order thực hiện trước khi quay**:
  1. Mở localhost:3000
  2. Connect Sui wallet
  3. Tạo vài sightings + verify 1–2 cái
  4. Mở Star Map, zoom vào vùng có orange systems
  5. Chuẩn bị 2 system names cho Route Planner
  6. Bắt đầu record
- **Tool**: OBS Studio hoặc Loom (screen + voice)
- **Thời lượng mục tiêu**: 2:20–2:40
