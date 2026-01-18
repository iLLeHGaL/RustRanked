import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@rustranked/database";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as {
          id: string;
          username: string;
          avatar: string | null;
          email?: string;
        };

        // Upsert user in database
        await prisma.user.upsert({
          where: { discordId: discordProfile.id },
          update: {
            discordName: discordProfile.username,
            discordAvatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
          },
          create: {
            discordId: discordProfile.id,
            discordName: discordProfile.username,
            discordAvatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
          },
        });
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as { id: string };
        token.discordId = discordProfile.id;

        // Get user from database
        const user = await prisma.user.findUnique({
          where: { discordId: discordProfile.id },
          include: { subscription: true },
        });

        if (user) {
          token.userId = user.id;
          token.steamId = user.steamId;
          token.verificationStatus = user.verificationStatus;
          token.subscriptionStatus = user.subscription?.status || null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          discordId: token.discordId as string,
          steamId: token.steamId as string | null,
          verificationStatus: token.verificationStatus as string,
          subscriptionStatus: token.subscriptionStatus as string | null,
        },
      };
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
