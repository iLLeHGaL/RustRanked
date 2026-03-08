import { NextRequest, NextResponse } from "next/server";
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

// POST - Expire active wipe VIPs (optionally for a specific server)
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    let serverId: string | undefined;

    try {
      const body = await request.json();
      serverId = body.serverId;
    } catch {
      // No body or invalid JSON is fine - expire all
    }

    const whereClause: Record<string, unknown> = {
      type: "WIPE",
      status: "ACTIVE",
    };

    if (serverId) {
      whereClause.serverId = serverId;
    }

    // Find all active wipe VIPs
    const activeWipeVips = await prisma.vipAccess.findMany({
      where: whereClause,
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

    // Expire all matching wipe VIPs
    await prisma.vipAccess.updateMany({
      where: whereClause,
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
      message: `Expired ${activeWipeVips.length} wipe VIP(s)${serverId ? " for server" : ""}`,
    });
  } catch (error) {
    console.error("Expire wipe VIP error:", error);
    return NextResponse.json(
      { error: "Failed to expire wipe VIPs" },
      { status: 500 }
    );
  }
}
