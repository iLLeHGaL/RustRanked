import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { prisma, VerificationStatus, SubscriptionStatus } from "@rustranked/database";
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
        include: { subscription: true },
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
      const isSubscribed =
        user.subscription?.status === SubscriptionStatus.ACTIVE;
      const canPlay = isVerified && isSubscribed && user.steamId;

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
            name: "Subscription",
            value: isSubscribed
              ? `Active (until ${new Date(user.subscription!.currentPeriodEnd).toLocaleDateString()})`
              : `Inactive\n[Subscribe](${WEB_URL}/subscribe)`,
            inline: true,
          }
        )
        .addFields({
          name: "Server Access",
          value: canPlay
            ? "You can join RustRanked servers!"
            : "Complete the steps above to play",
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
