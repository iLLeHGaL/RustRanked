import { NextRequest, NextResponse } from "next/server";
import { verifyServerRequest } from "@/lib/server-auth";
import { getRankInfo } from "@/lib/elo";
import { prisma, VerificationStatus, SubscriptionStatus } from "@rustranked/database";

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

    // Find user by Steam ID
    const user = await prisma.user.findUnique({
      where: { steamId },
      include: {
        subscription: true,
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

    // Check subscription status
    const hasActiveSubscription =
      user.subscription?.status === SubscriptionStatus.ACTIVE;

    if (!hasActiveSubscription) {
      return NextResponse.json({
        allowed: false,
        reason: "NO_SUBSCRIPTION",
        message: "Active subscription required. Subscribe at rustranked.com",
        subscriptionStatus: user.subscription?.status || "NONE",
      });
    }

    // User is allowed to play
    const rankInfo = getRankInfo(user.elo);

    return NextResponse.json({
      allowed: true,
      player: {
        id: user.id,
        discordName: user.discordName,
        steamName: user.steamName,
        elo: user.elo,
        rank: rankInfo.tier,
        rankName: rankInfo.name,
        rankColor: rankInfo.color,
        kills: user.kills,
        deaths: user.deaths,
        wins: user.wins,
        losses: user.losses,
        matchesPlayed: user.matchesPlayed,
      },
    });
  } catch (error) {
    console.error("Verify player error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
