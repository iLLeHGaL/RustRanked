import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID");
  process.exit(1);
}

// Assert types after validation
const validClientId: string = clientId;

const rest = new REST().setToken(token);

async function deployCommands() {
  try {
    console.log(`Deploying ${commands.length} commands...`);

    const commandData = commands.map((c) => c.data.toJSON());

    if (guildId) {
      // Deploy to specific guild (faster for development)
      await rest.put(Routes.applicationGuildCommands(validClientId, guildId), {
        body: commandData,
      });
      console.log(`✅ Deployed commands to guild ${guildId}`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(validClientId), {
        body: commandData,
      });
      console.log("✅ Deployed commands globally");
    }
  } catch (error) {
    console.error("Failed to deploy commands:", error);
    process.exit(1);
  }
}

deployCommands();
