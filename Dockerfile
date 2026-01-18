FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY apps/discord-bot ./apps/discord-bot
COPY packages/database ./packages/database

# Generate Prisma client
RUN cd packages/database && pnpm prisma generate

# Build the discord bot
RUN pnpm --filter discord-bot build

# Start the bot
CMD ["pnpm", "--filter", "discord-bot", "start"]
