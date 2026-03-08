import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";
import { discordNotify } from "@/lib/discord-notify";

const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",") || [];

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return false;
  return ADMIN_DISCORD_IDS.includes(session.user.discordId);
}

// POST - Expire all active wipe VIPs (called when a new wipe starts)
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Find all active wipe VIPs
    const activeWipeVips = await prisma.vipAccess.findMany({
      where: {
        type: "WIPE",
        status: "ACTIVE",
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (activeWipeVips.length === 0) {
      return NextResponse.json({
        success: true,
        expiredCount: 0,
        message: "No active wipe VIPs to expire",
      });
    }

    // Expire all wipe VIPs
    await prisma.vipAccess.updateMany({
      where: {
        type: "WIPE",
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Notify affected users via Discord
    for (const vip of activeWipeVips) {
      await discordNotify.vipExpired(vip.userId);
    }

    return NextResponse.json({
      success: true,
      expiredCount: activeWipeVips.length,
      message: `Expired ${activeWipeVips.length} wipe VIP(s)`,
    });
  } catch (error) {
    console.error("Expire wipe VIP error:", error);
    return NextResponse.json(
      { error: "Failed to expire wipe VIPs" },
      { status: 500 }
    );
  }
}
