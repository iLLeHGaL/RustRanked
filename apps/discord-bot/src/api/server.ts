import { createServer, IncomingMessage, ServerResponse } from "http";
import { prisma } from "@rustranked/database";
import { client } from "../index.js";
import { syncUserRoles } from "../services/role-sync.js";
import {
  sendNotification,
  createNewSubscriberEmbed,
  createVerifiedEmbed,
  createNewPlayerEmbed,
  createBanEvasionEmbed,
  createDuplicateIdentityEmbed,
} from "../services/notifications.js";

const API_SECRET = process.env.BOT_API_SECRET;
// Railway provides PORT env var, fall back to BOT_API_PORT or 3001
const API_PORT = parseInt(process.env.PORT || process.env.BOT_API_PORT || "3001", 10);

interface WebhookPayload {
  event: string;
  userId: string;
  data?: Record<string, unknown>;
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // CORS headers
  res.setHeader("Content-Type", "application/json");

  // Health check endpoint (no auth required)
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Auth check
  const authHeader = req.headers.authorization;
  if (!API_SECRET || authHeader !== `Bearer ${API_SECRET}`) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Parse body
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }

  const { event, userId, data } = payload;

  if (!event || !userId) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Missing event or userId" }));
    return;
  }

  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "User not found" }));
      return;
    }

    // Get Discord guild member
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Guild not configured" }));
      return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Guild not found" }));
      return;
    }

    let member;
    try {
      member = await guild.members.fetch(user.discordId);
    } catch {
      // User not in guild
      member = null;
    }

    // Handle events
    switch (event) {
      case "user.created":
        await sendNotification(
          createNewPlayerEmbed(user.discordName, user.discordAvatar)
        );
        break;

      case "subscription.created":
      case "subscription.renewed":
        if (member) {
          await syncUserRoles(member, user);
        }
        await sendNotification(
          createNewSubscriberEmbed(user.discordName, user.discordAvatar)
        );
        break;

      case "subscription.canceled":
      case "subscription.expired":
        if (member) {
          await syncUserRoles(member, user);
        }
        break;

      case "verification.completed":
        if (member) {
          await syncUserRoles(member, user);
        }
        await sendNotification(
          createVerifiedEmbed(user.discordName, user.discordAvatar)
        );
        break;

      case "sync.roles":
        if (member) {
          await syncUserRoles(member, user);
        }
        break;

      case "anticheat.ban_evasion": {
        const matchedBanUser = data?.matchedUserId
          ? await prisma.user.findUnique({ where: { id: data.matchedUserId as string } })
          : null;
        await sendNotification(
          createBanEvasionEmbed(
            user.discordName,
            user.discordAvatar,
            matchedBanUser?.discordName || "Unknown"
          )
        );
        break;
      }

      case "anticheat.duplicate_flagged": {
        const matchedFlagUser = data?.matchedUserId
          ? await prisma.user.findUnique({ where: { id: data.matchedUserId as string } })
          : null;
        await sendNotification(
          createDuplicateIdentityEmbed(
            user.discordName,
            user.discordAvatar,
            matchedFlagUser?.discordName || "Unknown"
          )
        );
        break;
      }

      default:
        console.log(`Unknown event: ${event}`);
    }

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("API error:", error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

export function startApiServer(): void {
  const server = createServer(handleRequest);

  // Bind to 0.0.0.0 for Railway/Docker compatibility
  server.listen(API_PORT, "0.0.0.0", () => {
    console.log(`📡 Bot API server listening on port ${API_PORT}`);
  });
}
