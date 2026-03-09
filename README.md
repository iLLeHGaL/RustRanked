# RustRanked

A competitive gaming platform for Rust with ID verification, per-server VIP, battle pass progression, leaderboards, and Discord integration.

## Features

- **Free-to-Play** - No subscription required to play. Register, verify, and you're in
- **ID Verification** - Government ID verification via Stripe Identity prevents cheaters and alt accounts
- **Per-Server VIP** - $10/month or $5/wipe per individual server for queue priority
- **Battle Pass** - Season-based XP system with tiers and rewards
- **Leaderboards** - 12 stat categories with grouped server selector, wipe history, and all-time aggregation
- **Identity Anti-Cheat** - SHA-256 fingerprinting to detect alt accounts and ban evasion
- **Discord Integration** - Role sync, slash commands, and event notifications
- **Carbon Plugin** - Server plugin for player verification, stat tracking, and XP awards

## Tech Stack

| Component | Technology |
|-----------|------------|
| Web Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon) + Prisma v6 |
| Authentication | NextAuth.js (Discord + Steam) |
| Payments | Stripe (VIP + Identity Verification) |
| Styling | Tailwind CSS |
| Discord Bot | Discord.js |
| Game Server | Carbon modding framework |
| Monorepo | pnpm + Turborepo |

## Project Structure

```
rustranked/
├── apps/
│   ├── web/                      # Next.js web application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── dashboard/    # User dashboard
│   │   │   │   ├── leaderboard/  # Public leaderboard (server dropdown + wipe selector)
│   │   │   │   ├── servers/      # Server listing page
│   │   │   │   ├── vip/          # VIP purchase page
│   │   │   │   ├── battle-pass/  # Battle pass progress
│   │   │   │   ├── verify/       # ID verification
│   │   │   │   ├── billing/      # Billing management
│   │   │   │   ├── map-voting/   # Map voting
│   │   │   │   └── api/
│   │   │   │       ├── auth/     # NextAuth endpoints
│   │   │   │       ├── stripe/   # Payment + verification endpoints
│   │   │   │       ├── steam/    # Steam linking
│   │   │   │       ├── server/   # Game server API
│   │   │   │       ├── stats/    # Stats tracking
│   │   │   │       ├── leaderboard/ # Leaderboard API
│   │   │   │       ├── battle-pass/ # Battle pass API
│   │   │   │       ├── xp/       # XP batch awards
│   │   │   │       ├── admin/    # Admin endpoints
│   │   │   │       └── webhooks/ # Stripe webhooks
│   │   │   ├── components/
│   │   │   └── lib/
│   │   │       ├── auth.ts
│   │   │       ├── stripe.ts
│   │   │       ├── steam.ts
│   │   │       ├── server-auth.ts
│   │   │       ├── xp-engine.ts
│   │   │       ├── identity-fingerprint.ts
│   │   │       └── discord-notify.ts
│   │   └── package.json
│   │
│   └── discord-bot/              # Discord bot
│       ├── src/
│       │   ├── index.ts          # Bot entry
│       │   ├── commands/         # Slash commands
│       │   ├── services/         # Role sync, notifications
│       │   └── api/              # HTTP API server
│       └── package.json
│
├── packages/
│   └── database/                 # Shared Prisma schema
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts           # Server seed script
│       └── package.json
│
├── carbon/
│   └── plugins/
│       └── RustRanked.cs         # Rust server plugin (Carbon)
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (recommend [Neon](https://neon.tech))

### 1. Clone and Install

```bash
git clone <repo>
cd rustranked
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example apps/web/.env.local
cp apps/discord-bot/.env.example apps/discord-bot/.env
```

Fill in the required values (see Environment Variables section below).

### 3. Set Up Database

```bash
pnpm db:generate
pnpm db:push
```

### 4. Seed Servers

```bash
cd packages/database
npx tsx prisma/seed.ts
```

### 5. Run Development Servers

```bash
# Run everything
pnpm dev

# Or run individually
pnpm --filter @rustranked/web dev
pnpm --filter @rustranked/discord-bot dev
```

### 6. Deploy Discord Commands

```bash
cd apps/discord-bot
pnpm deploy-commands
```

## Environment Variables

### Web App (`apps/web/.env.local`)

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Discord OAuth
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""

# Steam
STEAM_API_KEY=""

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_VIP_MONTHLY_PRICE_ID=""
STRIPE_VIP_WIPE_PRICE_ID=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Server API
SERVER_API_SECRET=""
STATS_API_KEY=""

# Identity Anti-Cheat
IDENTITY_FINGERPRINT_SALT=""

# Admin
ADMIN_DISCORD_IDS="123456789,987654321"

# Discord Bot API
DISCORD_BOT_API_URL="http://localhost:3001"
DISCORD_BOT_API_SECRET=""
```

### Discord Bot (`apps/discord-bot/.env`)

```env
# Bot
DISCORD_BOT_TOKEN=""
DISCORD_CLIENT_ID=""
DISCORD_GUILD_ID=""

# Roles
VERIFIED_ROLE_ID=""
VIP_ROLE_ID=""

# Database
DATABASE_URL=""

# API
BOT_API_SECRET=""
BOT_API_PORT="3001"
NOTIFICATIONS_CHANNEL_ID=""
WEB_URL="https://rustranked.com"
```

## API Endpoints

### Server API (for Carbon plugin)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/server/verify-player` | POST | Bearer token | Verify player on connect |
| `/api/stats/update` | POST | API key in body | Update single player stats |
| `/api/stats/update` | PUT | API key in body | Batch update multiple players |
| `/api/xp/batch-award` | PUT | API key in body | Batch award XP |

### Admin API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/servers` | GET/POST | List/register servers |
| `/api/admin/servers/[id]` | PATCH/DELETE | Update/remove server |
| `/api/admin/seasons` | GET/POST | Manage battle pass seasons |
| `/api/admin/battle-pass/tiers` | GET/POST | Manage battle pass tiers |
| `/api/admin/identity-flags` | GET/PATCH | Review identity flags |
| `/api/admin/expire-wipe-vip` | POST | Expire wipe VIP access |

## Carbon Plugin

### Installation

1. Install [Carbon](https://carbonmod.gg) on your Rust server
2. Copy `carbon/plugins/RustRanked.cs` to your server's `carbon/plugins/` folder
3. Restart server or run `c.reload RustRanked`
4. Edit `carbon/configs/RustRanked.json`:

```json
{
  "API URL": "https://rustranked.com/api",
  "API Key": "YOUR_SERVER_API_KEY",
  "Stats API Key": "YOUR_STATS_API_KEY",
  "Server Type": "US_MAIN",
  "Wipe ID": "wipe_2026_03_07",
  "Kick Unverified Players": true,
  "Show Welcome Message": true,
  "Check Interval (seconds)": 30.0,
  "Stats Report Interval (seconds)": 300.0
}
```

### In-Game Commands

| Command | Description |
|---------|-------------|
| `/rr` or `/rustranked` | Show help menu |
| `/rr verify` | Re-verify account |
| `/rr bp` or `/rr battlepass` | Show battle pass progress |

### Queue Plugin API

Other plugins can check VIP status:

```csharp
bool isVip = (bool)plugins.Find("RustRanked").Call("IsVip", player.UserIDString);
```

## Discord Bot Commands

| Command | Description |
|---------|-------------|
| `/battlepass` | View battle pass progress |
| `/daily` | Claim daily login reward |

## Deployment

### Web App (Vercel)

```bash
npm i -g vercel
cd apps/web
vercel
```

### Architecture

```
┌─────────────┐     verify-player      ┌──────────────────┐
│  Rust Game   │ ──────────────────────→ │   Next.js Web    │
│   Server     │     stats/update       │  (Vercel)        │
│  + Carbon    │ ──────────────────────→ │                  │
│  + Plugin    │ ←────────────────────── │  PostgreSQL      │
│              │   allowed/denied/VIP    │  (Neon)          │
└─────────────┘                         └────────┬─────────┘
                                                 │
                                        discord-notify
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  Discord Bot     │
                                        │  (HTTP API)      │
                                        └──────────────────┘
```

## Security

- Server API keys are SHA-256 hashed before storage
- Stripe webhook signatures verified on all events
- Identity fingerprints salted + hashed (never stored in plain text)
- Steam ID verified via OpenID
- Admin access restricted by Discord user ID

## License

Private - All rights reserved

---

Built with Claude Code
