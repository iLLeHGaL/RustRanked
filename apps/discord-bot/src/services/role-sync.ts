import { GuildMember } from "discord.js";
import {
  User,
  Subscription,
  VerificationStatus,
  SubscriptionStatus,
} from "@rustranked/database";

type UserWithSubscription = User & {
  subscription: Subscription | null;
};

// Rank tier to role ID mapping
const RANK_ROLES: Record<string, string | undefined> = {
  BRONZE: process.env.BRONZE_ROLE_ID,
  SILVER: process.env.SILVER_ROLE_ID,
  GOLD: process.env.GOLD_ROLE_ID,
  PLATINUM: process.env.PLATINUM_ROLE_ID,
  DIAMOND: process.env.DIAMOND_ROLE_ID,
  MASTER: process.env.MASTER_ROLE_ID,
  GRANDMASTER: process.env.GRANDMASTER_ROLE_ID,
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

export async function syncUserRoles(
  member: GuildMember,
  user: UserWithSubscription
): Promise<void> {
  const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
  const subscriberRoleId = process.env.SUBSCRIBER_ROLE_ID;

  const isVerified = user.verificationStatus === VerificationStatus.VERIFIED;
  const isSubscribed = user.subscription?.status === SubscriptionStatus.ACTIVE;

  const rolesToAdd: string[] = [];
  const rolesToRemove: string[] = [];

  // Verified role
  if (verifiedRoleId) {
    if (isVerified && !member.roles.cache.has(verifiedRoleId)) {
      rolesToAdd.push(verifiedRoleId);
    } else if (!isVerified && member.roles.cache.has(verifiedRoleId)) {
      rolesToRemove.push(verifiedRoleId);
    }
  }

  // Subscriber role
  if (subscriberRoleId) {
    if (isSubscribed && !member.roles.cache.has(subscriberRoleId)) {
      rolesToAdd.push(subscriberRoleId);
    } else if (!isSubscribed && member.roles.cache.has(subscriberRoleId)) {
      rolesToRemove.push(subscriberRoleId);
    }
  }

  // Rank roles (only for players with matches)
  if (user.matchesPlayed > 0) {
    const currentRank = getRankTier(user.elo);
    const currentRankRoleId = RANK_ROLES[currentRank];

    // Remove old rank roles, add current one
    for (const [rank, roleId] of Object.entries(RANK_ROLES)) {
      if (!roleId) continue;

      if (rank === currentRank) {
        if (!member.roles.cache.has(roleId)) {
          rolesToAdd.push(roleId);
        }
      } else {
        if (member.roles.cache.has(roleId)) {
          rolesToRemove.push(roleId);
        }
      }
    }
  }

  // Apply role changes
  try {
    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd);
    }
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove);
    }
  } catch (error) {
    console.error(`Failed to sync roles for ${member.user.tag}:`, error);
  }
}

export async function removeAllRustRankedRoles(
  member: GuildMember
): Promise<void> {
  const rolesToRemove: string[] = [];

  const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
  const subscriberRoleId = process.env.SUBSCRIBER_ROLE_ID;

  if (verifiedRoleId && member.roles.cache.has(verifiedRoleId)) {
    rolesToRemove.push(verifiedRoleId);
  }

  if (subscriberRoleId && member.roles.cache.has(subscriberRoleId)) {
    rolesToRemove.push(subscriberRoleId);
  }

  for (const roleId of Object.values(RANK_ROLES)) {
    if (roleId && member.roles.cache.has(roleId)) {
      rolesToRemove.push(roleId);
    }
  }

  if (rolesToRemove.length > 0) {
    try {
      await member.roles.remove(rolesToRemove);
    } catch (error) {
      console.error(`Failed to remove roles for ${member.user.tag}:`, error);
    }
  }
}
