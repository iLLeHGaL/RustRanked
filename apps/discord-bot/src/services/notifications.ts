import { EmbedBuilder, TextChannel } from "discord.js";
import { client } from "../index.js";

const NOTIFICATIONS_CHANNEL_ID = process.env.NOTIFICATIONS_CHANNEL_ID;

export async function sendNotification(embed: EmbedBuilder) {
  if (!NOTIFICATIONS_CHANNEL_ID) return;

  try {
    const channel = await client.channels.fetch(NOTIFICATIONS_CHANNEL_ID);
    if (channel && channel instanceof TextChannel) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

export function createNewSubscriberEmbed(
  discordName: string,
  discordAvatar: string | null
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle("🎉 New Subscriber!")
    .setDescription(`**${discordName}** just subscribed to RustRanked!`)
    .setThumbnail(discordAvatar || null)
    .setTimestamp();
}

export function createVerifiedEmbed(
  discordName: string,
  discordAvatar: string | null
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x00aaff)
    .setTitle("✅ Player Verified")
    .setDescription(`**${discordName}** has completed ID verification!`)
    .setThumbnail(discordAvatar || null)
    .setTimestamp();
}

export function createNewPlayerEmbed(
  discordName: string,
  discordAvatar: string | null
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xcd4832)
    .setTitle("👋 New Player")
    .setDescription(`**${discordName}** just joined RustRanked!`)
    .setThumbnail(discordAvatar || null)
    .setTimestamp();
}

export function createBanEvasionEmbed(
  flaggedName: string,
  flaggedAvatar: string | null,
  matchedName: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("🚨 BAN EVASION DETECTED")
    .setDescription(
      `**${flaggedName}** attempted verification but their identity matches banned account **${matchedName}**.\n\nThe account has been **automatically banned**.`
    )
    .setThumbnail(flaggedAvatar || null)
    .setTimestamp();
}

export function createDuplicateIdentityEmbed(
  flaggedName: string,
  flaggedAvatar: string | null,
  matchedName: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xff8c00)
    .setTitle("⚠️ Duplicate Identity Detected")
    .setDescription(
      `**${flaggedName}** completed verification but their identity matches existing account **${matchedName}**.\n\nThis has been flagged for **admin review**.`
    )
    .setThumbnail(flaggedAvatar || null)
    .setTimestamp();
}
