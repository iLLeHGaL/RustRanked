import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { prisma, VerificationStatus, SubscriptionStatus } from "@rustranked/database";
import { removeAllRustRankedRoles } from "../services/role-sync.js";

const WEB_URL = process.env.WEB_URL || "https://rustranked.com";

// Rank colors
const RANK_COLORS: Record<string, number> = {
  BRONZE: 0xcd7f32,
  SILVER: 0xc0c0c0,
  GOLD: 0xffd700,
  PLATINUM: 0xe5e4e2,
  DIAMOND: 0xb9f2ff,
  MASTER: 0x9966cc,
  GRANDMASTER: 0xff4500,
};

function getRankTier(elo: number): string {
  if (elo >= 2800) return "GRANDMASTER";
  if (elo >= 2400) return "MASTER";
  if (elo >= 2000) return "DIAMOND";
  if (elo >= 1600) return "PLATINUM";
  if (elo >= 1200) return "GOLD";
  if (elo >= 800) return "SILVER";
  return "BRONZE";
}

function getRankName(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export const commands = [
  // /status command
  {
    data: new SlashCommandBuilder()
      .setName("status")
      .setDescription("Check your RustRanked account status"),

    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply({ ephemeral: true });

      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { subscription: true },
      });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle("❌ Not Registered")
          .setDescription(
            `You haven't linked your Discord account to RustRanked yet.`
          )
          .addFields({
            name: "Get Started",
            value: `[Sign up at ${WEB_URL}](${WEB_URL}/login)`,
          });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const isVerified =
        user.verificationStatus === VerificationStatus.VERIFIED;
      const isSubscribed =
        user.subscription?.status === SubscriptionStatus.ACTIVE;
      const canPlay = isVerified && isSubscribed && user.steamId;

      const embed = new EmbedBuilder()
        .setColor(canPlay ? 0x00ff00 : 0xffaa00)
        .setTitle("🎮 RustRanked Status")
        .setThumbnail(user.discordAvatar || interaction.user.displayAvatarURL())
        .addFields(
          {
            name: "Steam",
            value: user.steamId
              ? `✅ Linked (${user.steamName})`
              : `❌ Not linked\n[Link Steam](${WEB_URL}/dashboard)`,
            inline: true,
          },
          {
            name: "Verification",
            value: isVerified
              ? "✅ Verified"
              : user.verificationStatus === VerificationStatus.PENDING
                ? "⏳ Pending"
                : `❌ Not verified\n[Verify ID](${WEB_URL}/verify)`,
            inline: true,
          },
          {
            name: "Subscription",
            value: isSubscribed
              ? `✅ Active (until ${new Date(user.subscription!.currentPeriodEnd).toLocaleDateString()})`
              : `❌ Inactive\n[Subscribe](${WEB_URL}/subscribe)`,
            inline: true,
          }
        )
        .addFields({
          name: "Server Access",
          value: canPlay
            ? "✅ You can join RustRanked servers!"
            : "❌ Complete the steps above to play",
        });

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // /stats command
  {
    data: new SlashCommandBuilder()
      .setName("stats")
      .setDescription("View your RustRanked stats or another player's stats")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("User to check stats for")
          .setRequired(false)
      ),

    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();

      const targetUser = interaction.options.getUser("user") || interaction.user;

      const user = await prisma.user.findUnique({
        where: { discordId: targetUser.id },
      });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle("❌ Not Found")
          .setDescription(
            targetUser.id === interaction.user.id
              ? `You haven't registered on RustRanked yet. [Sign up](${WEB_URL}/login)`
              : `${targetUser.username} hasn't registered on RustRanked.`
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const rankTier = getRankTier(user.elo);
      const rankColor = RANK_COLORS[rankTier] || 0x888888;
      const kd =
        user.deaths > 0
          ? (user.kills / user.deaths).toFixed(2)
          : user.kills.toString();
      const winRate =
        user.wins + user.losses > 0
          ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) + "%"
          : "N/A";

      const embed = new EmbedBuilder()
        .setColor(rankColor)
        .setTitle(`📊 ${user.steamName || user.discordName}'s Stats`)
        .setThumbnail(user.discordAvatar || targetUser.displayAvatarURL())
        .addFields(
          {
            name: "Rank",
            value: `**${getRankName(rankTier)}**`,
            inline: true,
          },
          {
            name: "ELO",
            value: `**${user.elo}** (Peak: ${user.peakElo})`,
            inline: true,
          },
          {
            name: "Matches",
            value: `${user.matchesPlayed}`,
            inline: true,
          },
          {
            name: "K/D",
            value: `${user.kills}/${user.deaths} (${kd})`,
            inline: true,
          },
          {
            name: "W/L",
            value: `${user.wins}/${user.losses} (${winRate})`,
            inline: true,
          }
        )
        .setFooter({ text: "RustRanked" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // /leaderboard command
  {
    data: new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("View the top RustRanked players"),

    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();

      const topPlayers = await prisma.user.findMany({
        where: { matchesPlayed: { gt: 0 } },
        orderBy: { elo: "desc" },
        take: 10,
        select: {
          discordName: true,
          steamName: true,
          elo: true,
          wins: true,
          losses: true,
        },
      });

      if (topPlayers.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x888888)
          .setTitle("🏆 Leaderboard")
          .setDescription("No ranked players yet. Be the first!");

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const leaderboardText = topPlayers
        .map((player, index) => {
          const medal =
            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
          const name = player.steamName || player.discordName;
          const winRate =
            player.wins + player.losses > 0
              ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0) + "%"
              : "N/A";
          return `${medal} **${name}** - ${player.elo} ELO (${winRate} WR)`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle("🏆 RustRanked Leaderboard")
        .setDescription(leaderboardText)
        .addFields({
          name: "Full Leaderboard",
          value: `[View on website](${WEB_URL}/leaderboard)`,
        })
        .setFooter({ text: "Top 10 players by ELO" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // /link command
  {
    data: new SlashCommandBuilder()
      .setName("link")
      .setDescription("Get the link to connect your accounts"),

    async execute(interaction: ChatInputCommandInteraction) {
      const embed = new EmbedBuilder()
        .setColor(0xcd4832)
        .setTitle("🔗 Link Your Accounts")
        .setDescription("Connect your accounts to start playing on RustRanked!")
        .addFields(
          {
            name: "Step 1: Sign In",
            value: `[Login with Discord](${WEB_URL}/login)`,
          },
          {
            name: "Step 2: Link Steam",
            value: `Connect your Steam account on your [dashboard](${WEB_URL}/dashboard)`,
          },
          {
            name: "Step 3: Subscribe",
            value: `Get a monthly subscription at [${WEB_URL}/subscribe](${WEB_URL}/subscribe)`,
          },
          {
            name: "Step 4: Verify ID",
            value: `Complete ID verification at [${WEB_URL}/verify](${WEB_URL}/verify)`,
          }
        )
        .setFooter({ text: "Your roles will sync automatically once complete!" });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // /reset-all-roles command (Admin only)
  {
    data: new SlashCommandBuilder()
      .setName("reset-all-roles")
      .setDescription("Remove all RustRanked roles from everyone (Admin only)")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply("This command can only be used in a server.");
        return;
      }

      try {
        const members = await guild.members.fetch();
        let count = 0;

        for (const [, member] of members) {
          if (member.user.bot) continue;
          await removeAllRustRankedRoles(member);
          count++;
        }

        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle("✅ Roles Reset")
          .setDescription(`Removed RustRanked roles from ${count} members.`);

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to reset roles:", error);
        await interaction.editReply("Failed to reset roles. Check bot permissions.");
      }
    },
  },
];
