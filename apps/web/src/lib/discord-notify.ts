// Notify Discord bot of events for role sync and announcements

const BOT_API_URL = process.env.DISCORD_BOT_API_URL;
const BOT_API_SECRET = process.env.DISCORD_BOT_API_SECRET;

interface NotifyOptions {
  event: string;
  userId: string;
  data?: Record<string, unknown>;
}

export async function notifyDiscordBot(options: NotifyOptions): Promise<boolean> {
  if (!BOT_API_URL || !BOT_API_SECRET) {
    console.log("Discord bot API not configured, skipping notification");
    return false;
  }

  try {
    const response = await fetch(BOT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BOT_API_SECRET}`,
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      console.error("Discord bot notification failed:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Discord bot notification error:", error);
    return false;
  }
}

// Convenience functions for common events
export const discordNotify = {
  userCreated: (userId: string) =>
    notifyDiscordBot({ event: "user.created", userId }),

  subscriptionCreated: (userId: string) =>
    notifyDiscordBot({ event: "subscription.created", userId }),

  subscriptionRenewed: (userId: string) =>
    notifyDiscordBot({ event: "subscription.renewed", userId }),

  subscriptionCanceled: (userId: string) =>
    notifyDiscordBot({ event: "subscription.canceled", userId }),

  subscriptionExpired: (userId: string) =>
    notifyDiscordBot({ event: "subscription.expired", userId }),

  verificationCompleted: (userId: string) =>
    notifyDiscordBot({ event: "verification.completed", userId }),

  rankChanged: (userId: string, oldRank: string, newRank: string) =>
    notifyDiscordBot({
      event: "rank.changed",
      userId,
      data: { oldRank, newRank },
    }),

  syncRoles: (userId: string) =>
    notifyDiscordBot({ event: "sync.roles", userId }),
};
