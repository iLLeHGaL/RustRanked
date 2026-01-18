import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  ActivityType,
} from "discord.js";
import { prisma } from "@rustranked/database";
import { handleInteraction } from "./handlers/interaction.js";
import { syncUserRoles } from "./services/role-sync.js";
import { startApiServer } from "./api/server.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);

  // Set bot status
  readyClient.user.setActivity("RustRanked", {
    type: ActivityType.Playing,
  });

  // Initial role sync for all members
  console.log("🔄 Starting initial role sync...");
  await syncAllMembers();
  console.log("✅ Initial role sync complete");

  // Periodic role sync every 5 minutes
  setInterval(syncAllMembers, 5 * 60 * 1000);

  // Start the API server for webhook notifications
  startApiServer();
});

client.on(Events.InteractionCreate, handleInteraction);

client.on(Events.GuildMemberAdd, async (member) => {
  console.log(`👋 New member joined: ${member.user.tag}`);

  // Check if user is registered and sync their roles
  const user = await prisma.user.findUnique({
    where: { discordId: member.user.id },
    include: { subscription: true },
  });

  if (user) {
    await syncUserRoles(member, user);
  }
});

async function syncAllMembers() {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    console.error("DISCORD_GUILD_ID not set");
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error("Guild not found");
    return;
  }

  try {
    // Fetch all members
    const members = await guild.members.fetch();

    // Get all registered users
    const users = await prisma.user.findMany({
      include: { subscription: true },
    });

    const userMap = new Map(users.map((u) => [u.discordId, u]));

    let synced = 0;
    for (const [, member] of members) {
      if (member.user.bot) continue;

      const user = userMap.get(member.user.id);
      if (user) {
        await syncUserRoles(member, user);
        synced++;
      }
    }

    console.log(`🔄 Synced roles for ${synced} members`);
  } catch (error) {
    console.error("Error syncing members:", error);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

// Start the bot
client.login(process.env.DISCORD_BOT_TOKEN);

export { client };
