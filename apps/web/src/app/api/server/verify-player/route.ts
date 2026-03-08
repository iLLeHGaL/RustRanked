import { NextRequest, NextResponse } from "next/server";
import { verifyServerRequest } from "@/lib/server-auth";
import { prisma, VerificationStatus } from "@rustranked/database";

export async function POST(request: NextRequest) {
  // Verify server authentication
  const auth = await verifyServerRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { steamId } = body;

    if (!steamId) {
      return NextResponse.json(
        { error: "steamId is required" },
        { status: 400 }
      );
    }

    // Find user by Steam ID (VIP filtered to this specific server)
    const user = await prisma.user.findUnique({
      where: { steamId },
      include: {
        vipAccess: {
          where: {
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
            serverId: auth.server!.id,
          },
        },
        bans: {
          where: {
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
      },
    });

    // User not found
    if (!user) {
      return NextResponse.json({
        allowed: false,
        reason: "NOT_REGISTERED",
        message: "Steam account not linked to RustRanked. Visit rustranked.com to register.",
      });
    }

    // Check for active bans
    if (user.bans.length > 0) {
      const ban = user.bans[0];
      return NextResponse.json({
        allowed: false,
        reason: "BANNED",
        message: `You are banned from RustRanked. Reason: ${ban.reason}`,
        banExpires: ban.expiresAt?.toISOString() || null,
      });
    }

    // Check verification status
    if (user.verificationStatus !== VerificationStatus.VERIFIED) {
      return NextResponse.json({
        allowed: false,
        reason: "NOT_VERIFIED",
        message: "Complete ID verification at rustranked.com to play.",
        verificationStatus: user.verificationStatus,
      });
    }

    // No subscription check - game is free-to-play!

    // Check VIP status
    const hasVip = user.vipAccess.length > 0;

    // Fetch season data for response
    let seasonData = {};
    try {
      const season = await prisma.season.findFirst({
        where: { status: "ACTIVE" as const },
      });
      if (season) {
        const playerSeason = await prisma.playerSeason.findUnique({
          where: {
            userId_seasonId: {
              userId: user.id,
              seasonId: season.id,
            },
          },
        });
        seasonData = {
          seasonLevel: playerSeason?.currentLevel ?? 0,
          seasonXp: playerSeason?.currentXp ?? 0,
          hasPremium: true, // All players get full battle pass
        };
      }
    } catch {
      // Non-critical, continue without season data
    }

    // User is allowed to play
    return NextResponse.json({
      allowed: true,
      hasVip,
      player: {
        id: user.id,
        discordName: user.discordName,
        steamName: user.steamName,
      },
      ...seasonData,
    });
  } catch (error) {
    console.error("Verify player error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
