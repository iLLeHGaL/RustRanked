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

export function createRankUpEmbed(
  discordName: string,
  discordAvatar: string | null,
  oldRank: string,
  newRank: string,
  elo: number
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle("📈 Rank Up!")
    .setDescription(
      `**${discordName}** ranked up from **${oldRank}** to **${newRank}**!`
    )
    .addFields({ name: "New ELO", value: `${elo}`, inline: true })
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
