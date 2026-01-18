# RustRanked

A FACEIT-like competitive gaming platform for Rust with ID verification, ELO rankings, subscriptions, and Discord integration.

## Features

- **ID Verified Players** - Government ID verification via Stripe Identity prevents cheaters and smurfs
- **ELO Ranking System** - Skill-based matchmaking with 7 rank tiers (Bronze → Grandmaster)
- **Monthly Subscriptions** - Stripe-powered payments for server access
- **Discord Integration** - Automatic role sync, slash commands, and notifications
- **Rust Server Plugin** - Oxide/uMod plugin for player verification and stat tracking
- **Leaderboards** - Public rankings and player statistics

## Tech Stack

| Component | Technology |
|-----------|------------|
| Web Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma |
| Authentication | NextAuth.js (Discord + Steam) |
| Payments | Stripe (Subscriptions + Identity) |
| Styling | Tailwind CSS |
| Discord Bot | Discord.js |
| Monorepo | pnpm + Turborepo |

## Project Structure

```
rustranked/
├── apps/
│   ├── web/                      # Next.js web application
│   │   ├── src/
│   │   │   ├── app/              # Pages and API routes
│   │   │   │   ├── (auth)/       # Login pages
│   │   │   │   ├── dashboard/    # User dashboard
│   │   │   │   ├── subscribe/    # Subscription page
│   │   │   │   ├── verify/       # ID verification
│   │   │   │   ├── billing/      # Billing management
│   │   │   │   ├── leaderboard/  # Public leaderboard
│   │   │   │   └── api/
│   │   │   │       ├── auth/     # NextAuth endpoints
│   │   │   │       ├── stripe/   # Payment endpoints
│   │   │   │       ├── steam/    # Steam linking
│   │   │   │       ├── server/   # Game server API
│   │   │   │       ├── admin/    # Admin endpoints
│   │   │   │       └── webhooks/ # Stripe webhooks
│   │   │   ├── components/
│   │   │   └── lib/              # Utilities
│   │   │       ├── auth.ts
│   │   │       ├── stripe.ts
│   │   │       ├── elo.ts
│   │   │       ├── steam.ts
│   │   │       └── server-auth.ts
│   │   └── package.json
│   │
│   └── discord-bot/              # Discord bot
│       ├── src/
│       │   ├── index.ts          # Bot entry
│       │   ├── commands/         # Slash commands
│       │   ├── services/         # Role sync, notifications
│       │   └── api/              # Webhook receiver
│       └── package.json
│
├── packages/
│   └── database/                 # Shared Prisma schema
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
│
├── oxide/
│   └── plugins/
│       └── RustRanked.cs         # Rust server plugin
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
# Copy example env files
cp .env.example apps/web/.env.local
cp apps/discord-bot/.env.example apps/discord-bot/.env
```

Fill in the required values (see Environment Variables section below).

### 3. Set Up Database

```bash
pnpm db:generate
pnpm db:push
```

### 4. Run Development Servers

```bash
# Run everything
pnpm dev

# Or run individually
pnpm --filter @rustranked/web dev
pnpm --filter @rustranked/discord-bot dev
```

### 5. Deploy Discord Commands

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
STRIPE_PRICE_ID=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Server API
SERVER_API_SECRET=""

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
SUBSCRIBER_ROLE_ID=""

# Rank Roles (optional)
BRONZE_ROLE_ID=""
SILVER_ROLE_ID=""
GOLD_ROLE_ID=""
PLATINUM_ROLE_ID=""
DIAMOND_ROLE_ID=""
MASTER_ROLE_ID=""
GRANDMASTER_ROLE_ID=""

# Database
DATABASE_URL=""

# API
BOT_API_SECRET=""
BOT_API_PORT="3001"
NOTIFICATIONS_CHANNEL_ID=""
WEB_URL="https://rustranked.com"
```

## Account Setup Guide

### 1. Discord Developer Application

1. Go to https://discord.com/developers/applications
2. Create new application "RustRanked"
3. OAuth2 → Add redirect: `http://localhost:3000/api/auth/callback/discord`
4. Copy Client ID and Client Secret
5. Bot → Create bot, copy token

### 2. Stripe Account

1. Sign up at https://stripe.com
2. Enable Identity in product settings
3. Create Product → Price ($15-25/month subscription)
4. Copy API keys from Developers section
5. Set up webhook: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`, `identity.verification_session.*`

### 3. Steam API Key

1. Go to https://steamcommunity.com/dev/apikey
2. Register for API key

### 4. Database (Neon)

1. Sign up at https://neon.tech
2. Create project "rustranked"
3. Copy connection string

## API Endpoints

### Server API (for Rust plugin)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/server/verify-player` | POST | Check if player can join |
| `/api/server/report-stats` | POST | Report kills/deaths |
| `/api/server/match/start` | POST | Start a ranked match |
| `/api/server/match/end` | POST | End match, calculate ELO |

### Admin API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/servers` | GET | List all servers |
| `/api/admin/servers` | POST | Register new server |
| `/api/admin/servers/[id]` | PATCH | Update server |
| `/api/admin/servers/[id]` | DELETE | Remove server |

## Rust Server Plugin

### Installation

1. Install Oxide/uMod on your Rust server
2. Copy `oxide/plugins/RustRanked.cs` to your server's `oxide/plugins/` folder
3. Restart server or run `oxide.reload RustRanked`
4. Edit `oxide/config/RustRanked.json`:

```json
{
  "API URL": "https://rustranked.com/api",
  "API Key": "YOUR_SERVER_API_KEY",
  "Kick Unverified Players": true,
  "Show Welcome Message": true
}
```

### In-Game Commands

| Command | Description |
|---------|-------------|
| `/rr stats` | View your stats |
| `/rr top` | View online leaderboard |
| `/rr verify` | Re-verify account |

## Discord Bot Commands

| Command | Description |
|---------|-------------|
| `/status` | Check account status |
| `/stats [user]` | View player stats |
| `/leaderboard` | Top 10 players |
| `/link` | Account linking instructions |

## ELO System

### Rank Tiers

| Rank | ELO Range | Color |
|------|-----------|-------|
| Bronze | 0-799 | #CD7F32 |
| Silver | 800-1199 | #C0C0C0 |
| Gold | 1200-1599 | #FFD700 |
| Platinum | 1600-1999 | #E5E4E2 |
| Diamond | 2000-2399 | #B9F2FF |
| Master | 2400-2799 | #9966CC |
| Grandmaster | 2800+ | #FF4500 |

### K-Factor

- New players (< 10 matches): 40
- Regular players: 24
- Veterans (> 100 matches): 16

## Deployment

### Web App (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/web
vercel
```

### Discord Bot (Railway)

1. Create project at https://railway.app
2. Connect GitHub repo
3. Set root directory to `apps/discord-bot`
4. Add environment variables
5. Deploy

### Recommended Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│    Neon     │◀────│   Railway   │
│  (Next.js)  │     │ (PostgreSQL)│     │ (Discord)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       ▼                                       │
┌─────────────┐                               │
│   Stripe    │                               │
└─────────────┘                               │
       │                                       │
       └───────────────────────────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   Rust Server   │
                │  (Self-hosted)  │
                └─────────────────┘
```

## Cost Estimates

| Service | Free Tier | Growth |
|---------|-----------|--------|
| Vercel | Hobby (free) | Pro $20/mo |
| Neon PostgreSQL | 0.5GB free | $19/mo |
| Railway | $5 credits | ~$5-10/mo |
| Stripe | 2.9% + $0.30/tx | Same |
| Stripe Identity | $1.50/verification | Same |
| Domain | - | ~$12/year |
| Rust Server | - | $20-50/mo |

**Starting cost**: ~$25-60/month + transaction fees

## Security Considerations

- API keys are hashed before storage
- Webhook signatures are verified
- Rate limiting on all endpoints
- Steam ID verified via OpenID
- Server API uses secret key authentication
- ID verification processed by Stripe (PCI compliant)

## License

Private - All rights reserved

---

Built with Claude Code
