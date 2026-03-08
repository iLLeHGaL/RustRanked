import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { prisma, VerificationStatus, SeasonStatus } from "@rustranked/database";
import { removeAllRustRankedRoles } from "../services/role-sync.js";

const WEB_URL = process.env.WEB_URL || "https://rustranked.com";

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
        include: {
          vipAccess: {
            where: {
              status: "ACTIVE",
              expiresAt: { gt: new Date() },
            },
          },
        },
      });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle("Not Registered")
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
      const hasVip = user.vipAccess.length > 0;
      const canPlay = isVerified && !!user.steamId;

      const embed = new EmbedBuilder()
        .setColor(canPlay ? 0x00ff00 : 0xffaa00)
        .setTitle("RustRanked Status")
        .setThumbnail(user.discordAvatar || interaction.user.displayAvatarURL())
        .addFields(
          {
            name: "Steam",
            value: user.steamId
              ? `Linked (${user.steamName})`
              : `Not linked\n[Link Steam](${WEB_URL}/dashboard)`,
            inline: true,
          },
          {
            name: "Verification",
            value: isVerified
              ? "Verified"
              : user.verificationStatus === VerificationStatus.PENDING
                ? "Pending"
                : `Not verified\n[Verify ID](${WEB_URL}/verify)`,
            inline: true,
          },
          {
            name: "VIP",
            value: hasVip
              ? `Active (${user.vipAccess[0].type === "MONTHLY" ? "Monthly" : "Wipe"})`
              : `None\n[Get VIP](${WEB_URL}/vip)`,
            inline: true,
          }
        )
        .addFields({
          name: "Server Access",
          value: canPlay
            ? "You can join RustRanked servers!"
            : "Complete the steps above to play (free!)",
        });

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
        .setTitle("Link Your Accounts")
        .setDescription("Connect your accounts to start playing on RustRanked! It's free!")
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
            name: "Step 3: Verify ID",
            value: `Complete ID verification at [${WEB_URL}/verify](${WEB_URL}/verify)`,
          },
          {
            name: "Optional: Get VIP",
            value: `Skip the queue with [VIP](${WEB_URL}/vip) ($5/wipe or $10/mo)`,
          }
        )
        .setFooter({ text: "Your roles will sync automatically once complete!" });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // /battlepass command
  {
    data: new SlashCommandBuilder()
      .setName("battlepass")
      .setDescription("Check your Battle Pass progress"),

    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply({ ephemeral: true });

      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
      });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle("Not Registered")
          .setDescription(`Sign up at [${WEB_URL}](${WEB_URL}/login) first.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const season = await prisma.season.findFirst({
        where: { status: SeasonStatus.ACTIVE },
      });

      if (!season) {
        const embed = new EmbedBuilder()
          .setColor(0x888888)
          .setTitle("No Active Season")
          .setDescription("There is no active battle pass season right now.");
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const playerSeason = await prisma.playerSeason.findUnique({
        where: {
          userId_seasonId: {
            userId: user.id,
            seasonId: season.id,
          },
        },
      });

      const level = playerSeason?.currentLevel ?? 0;
      const xp = playerSeason?.currentXp ?? 0;
      const streak = playerSeason?.loginStreak ?? 0;

      const embed = new EmbedBuilder()
        .setColor(0xcd4832)
        .setTitle(`🎖️ ${season.name}`)
        .setThumbnail(user.discordAvatar || interaction.user.displayAvatarURL())
        .addFields(
          {
            name: "Level",
            value: `**${level}** / ${season.maxLevel}`,
            inline: true,
          },
          {
            name: "XP",
            value: xp.toLocaleString(),
            inline: true,
          },
          {
            name: "Login Streak",
            value: `${streak} days 🔥`,
            inline: true,
          }
        )
        .addFields({
          name: "View Details",
          value: `[Battle Pass](${WEB_URL}/battle-pass)`,
        })
        .setFooter({ text: `Season ${season.number}` });

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // /daily command
  {
    data: new SlashCommandBuilder()
      .setName("daily")
      .setDescription("Claim your daily login XP"),

    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply({ ephemeral: true });

      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
      });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle("Not Registered")
          .setDescription(`Sign up at [${WEB_URL}](${WEB_URL}/login) first.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const season = await prisma.season.findFirst({
        where: { status: SeasonStatus.ACTIVE },
      });

      if (!season) {
        const embed = new EmbedBuilder()
          .setColor(0x888888)
          .setTitle("No Active Season")
          .setDescription("There is no active battle pass season right now.");
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      try {
        let playerSeason = await prisma.playerSeason.findUnique({
          where: {
            userId_seasonId: {
              userId: user.id,
              seasonId: season.id,
            },
          },
        });

        if (!playerSeason) {
          playerSeason = await prisma.playerSeason.create({
            data: {
              userId: user.id,
              seasonId: season.id,
            },
          });
        }

        const now = new Date();
        const lastLogin = playerSeason.lastLoginDate;

        // Check if already claimed today
        if (lastLogin) {
          const isSameDay =
            lastLogin.getUTCFullYear() === now.getUTCFullYear() &&
            lastLogin.getUTCMonth() === now.getUTCMonth() &&
            lastLogin.getUTCDate() === now.getUTCDate();

          if (isSameDay) {
            const embed = new EmbedBuilder()
              .setColor(0x888888)
              .setTitle("Already Claimed")
              .setDescription("You've already claimed your daily XP today. Come back tomorrow!")
              .addFields({
                name: "Login Streak",
                value: `${playerSeason.loginStreak} days 🔥`,
                inline: true,
              });
            await interaction.editReply({ embeds: [embed] });
            return;
          }
        }

        // Calculate streak
        let newStreak: number;
        if (lastLogin) {
          const prevDay = new Date(Date.UTC(lastLogin.getUTCFullYear(), lastLogin.getUTCMonth(), lastLogin.getUTCDate()));
          const currDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          const diffMs = currDay.getTime() - prevDay.getTime();
          newStreak = diffMs === 24 * 60 * 60 * 1000 ? playerSeason.loginStreak + 1 : 1;
        } else {
          newStreak = 1;
        }

        let xpAwarded = 200;
        let streakBonus = 0;
        if (newStreak >= 7 && newStreak % 7 === 0) {
          streakBonus = 500;
          xpAwarded += streakBonus;
        }

        const newXp = playerSeason.currentXp + xpAwarded;

        // Simple level calc (matches xp-engine defaults)
        const baseXp = 1000;
        const increase = 200;
        const a = increase / 2;
        const b = baseXp - increase / 2;
        const discriminant = b * b + 4 * a * newXp;
        const newLevel = Math.min(
          Math.max(0, Math.floor((-b + Math.sqrt(discriminant)) / (2 * a))),
          season.maxLevel
        );

        await prisma.$transaction([
          prisma.playerSeason.update({
            where: { id: playerSeason.id },
            data: {
              currentXp: newXp,
              currentLevel: newLevel,
              lastLoginDate: now,
              loginStreak: newStreak,
            },
          }),
          prisma.xpEvent.create({
            data: {
              userId: user.id,
              seasonId: season.id,
              amount: 200,
              source: "daily_login",
              metadata: { streak: newStreak, via: "discord" },
            },
          }),
          ...(streakBonus > 0
            ? [
                prisma.xpEvent.create({
                  data: {
                    userId: user.id,
                    seasonId: season.id,
                    amount: streakBonus,
                    source: "login_streak_bonus",
                    metadata: { streak: newStreak, via: "discord" },
                  },
                }),
              ]
            : []),
        ]);

        const embed = new EmbedBuilder()
          .setColor(0x4ade80)
          .setTitle("✅ Daily Login Claimed!")
          .setDescription(`You earned **+${xpAwarded} XP**!${streakBonus > 0 ? `\n🎉 Includes **+${streakBonus} XP** 7-day streak bonus!` : ""}`)
          .addFields(
            { name: "Level", value: `${newLevel}`, inline: true },
            { name: "Total XP", value: newXp.toLocaleString(), inline: true },
            { name: "Streak", value: `${newStreak} days 🔥`, inline: true }
          );

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("Daily login error:", error);
        await interaction.editReply("Failed to claim daily login. Please try again later.");
      }
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
          .setTitle("Roles Reset")
          .setDescription(`Removed RustRanked roles from ${count} members.`);

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to reset roles:", error);
        await interaction.editReply("Failed to reset roles. Check bot permissions.");
      }
    },
  },
];
