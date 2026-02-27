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

  if (rolesToRemove.length > 0) {
    try {
      await member.roles.remove(rolesToRemove);
    } catch (error) {
      console.error(`Failed to remove roles for ${member.user.tag}:`, error);
    }
  }
}
