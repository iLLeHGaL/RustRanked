import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, SeasonStatus } from "@rustranked/database";

// POST - Claim a battle pass tier reward
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { level } = body;

    if (typeof level !== "number" || level < 1) {
      return NextResponse.json(
        { error: "Valid level number is required" },
        { status: 400 }
      );
    }

    const season = await prisma.season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
    });

    if (!season) {
      return NextResponse.json(
        { error: "No active season" },
        { status: 400 }
      );
    }

    const playerSeason = await prisma.playerSeason.findUnique({
      where: {
        userId_seasonId: {
          userId: session.user.id,
          seasonId: season.id,
        },
      },
    });

    if (!playerSeason) {
      return NextResponse.json(
        { error: "No progress for this season" },
        { status: 400 }
      );
    }

    // Validate level is reached
    if (level > playerSeason.currentLevel) {
      return NextResponse.json(
        { error: "Level not yet reached" },
        { status: 400 }
      );
    }

    // Check not already claimed
    if (playerSeason.claimedLevels.includes(level)) {
      return NextResponse.json(
        { error: "Level already claimed" },
        { status: 400 }
      );
    }

    // Find the tier(s) for this level
    const tiers = await prisma.battlePassTier.findMany({
      where: {
        seasonId: season.id,
        level,
      },
    });

    if (tiers.length === 0) {
      return NextResponse.json(
        { error: "No rewards at this level" },
        { status: 400 }
      );
    }

    // Check premium gating - filter to claimable tiers
    const claimableTiers = tiers.filter(
      (tier) => !tier.isPremium || playerSeason.hasPremium
    );

    if (claimableTiers.length === 0) {
      return NextResponse.json(
        { error: "Premium subscription required for this reward" },
        { status: 403 }
      );
    }

    // Update claimed levels
    await prisma.playerSeason.update({
      where: { id: playerSeason.id },
      data: {
        claimedLevels: [...playerSeason.claimedLevels, level],
      },
    });

    return NextResponse.json({
      success: true,
      claimed: claimableTiers.map((tier) => ({
        level: tier.level,
        isPremium: tier.isPremium,
        rewardType: tier.rewardType,
        rewardAmount: tier.rewardAmount,
      })),
    });
  } catch (error) {
    console.error("Claim battle pass tier error:", error);
    return NextResponse.json(
      { error: "Failed to claim reward" },
      { status: 500 }
    );
  }
}
