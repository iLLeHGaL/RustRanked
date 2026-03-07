import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, SeasonStatus, SubscriptionStatus } from "@rustranked/database";
import { getSeasonConfig, xpToNextLevel } from "@/lib/xp-engine";

// GET - Return user's battle pass progress for the active season
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const season = await prisma.season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
    });

    if (!season) {
      return NextResponse.json({ progress: null, season: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    const hasPremium = user?.subscription?.status === SubscriptionStatus.ACTIVE;

    // Find or create PlayerSeason
    let playerSeason = await prisma.playerSeason.findUnique({
      where: {
        userId_seasonId: {
          userId: session.user.id,
          seasonId: season.id,
        },
      },
    });

    if (!playerSeason) {
      playerSeason = await prisma.playerSeason.create({
        data: {
          userId: session.user.id,
          seasonId: season.id,
          hasPremium,
        },
      });
    } else if (playerSeason.hasPremium !== hasPremium) {
      // Sync premium status with subscription
      playerSeason = await prisma.playerSeason.update({
        where: { id: playerSeason.id },
        data: { hasPremium },
      });
    }

    const config = getSeasonConfig(season.xpPerLevel);
    const nextLevel = xpToNextLevel(
      playerSeason.currentXp,
      config.baseXp,
      config.increase
    );

    return NextResponse.json({
      season: {
        id: season.id,
        name: season.name,
        number: season.number,
        endsAt: season.endsAt.toISOString(),
        maxLevel: season.maxLevel,
      },
      progress: {
        currentXp: playerSeason.currentXp,
        currentLevel: playerSeason.currentLevel,
        hasPremium: playerSeason.hasPremium,
        claimedLevels: playerSeason.claimedLevels,
        loginStreak: playerSeason.loginStreak,
        lastLoginDate: playerSeason.lastLoginDate?.toISOString() || null,
        xpToNextLevel: nextLevel.remaining,
        xpRequiredForLevel: nextLevel.required,
        levelProgress: nextLevel.progress,
      },
    });
  } catch (error) {
    console.error("Get battle pass progress error:", error);
    return NextResponse.json(
      { error: "Failed to get battle pass progress" },
      { status: 500 }
    );
  }
}
