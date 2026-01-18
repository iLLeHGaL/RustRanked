FROM node:20-slim

# Install pnpm and OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY packages/database/package.json ./packages/database/

# Copy prisma schema (needed for postinstall)
COPY packages/database/prisma ./packages/database/prisma

# Install dependencies (including dev deps for tsx)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY apps/discord-bot ./apps/discord-bot
COPY packages/database ./packages/database

# Set working directory to the bot
WORKDIR /app/apps/discord-bot

# Use tsx to run TypeScript directly
CMD ["npx", "tsx", "src/index.ts"]
