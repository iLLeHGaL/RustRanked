import { GuildMember } from "discord.js";
import {
  User,
  Subscription,
  VipAccess,
  VerificationStatus,
} from "@rustranked/database";

type UserWithVip = User & {
  subscription: Subscription | null;
  vipAccess?: VipAccess[];
};

export async function syncUserRoles(
  member: GuildMember,
  user: UserWithVip
): Promise<void> {
  const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
  const vipRoleId = process.env.VIP_ROLE_ID || process.env.SUBSCRIBER_ROLE_ID;

  const isVerified = user.verificationStatus === VerificationStatus.VERIFIED;
  const hasVip = user.vipAccess?.some(
    (v) => v.status === "ACTIVE" && new Date(v.expiresAt) > new Date()
  ) ?? false;

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

  // VIP role
  if (vipRoleId) {
    if (hasVip && !member.roles.cache.has(vipRoleId)) {
      rolesToAdd.push(vipRoleId);
    } else if (!hasVip && member.roles.cache.has(vipRoleId)) {
      rolesToRemove.push(vipRoleId);
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
  const vipRoleId = process.env.VIP_ROLE_ID || process.env.SUBSCRIBER_ROLE_ID;

  if (verifiedRoleId && member.roles.cache.has(verifiedRoleId)) {
    rolesToRemove.push(verifiedRoleId);
  }

  if (vipRoleId && member.roles.cache.has(vipRoleId)) {
    rolesToRemove.push(vipRoleId);
  }

  if (rolesToRemove.length > 0) {
    try {
      await member.roles.remove(rolesToRemove);
    } catch (error) {
      console.error(`Failed to remove roles for ${member.user.tag}:`, error);
    }
  }
}
