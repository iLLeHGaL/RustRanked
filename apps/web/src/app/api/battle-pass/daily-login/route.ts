import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, SeasonStatus } from "@rustranked/database";
import {
  getSeasonConfig,
  levelFromXp,
  XP_SOURCES,
} from "@/lib/xp-engine";
import { notifyDiscordBot } from "@/lib/discord-notify";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function isConsecutiveDay(prev: Date, current: Date): boolean {
  const prevDay = new Date(
    Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate())
  );
  const currDay = new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate()
    )
  );
  const diffMs = currDay.getTime() - prevDay.getTime();
  return diffMs === 24 * 60 * 60 * 1000;
}

// POST - Claim daily login XP
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        },
      });
    }

    const now = new Date();

    // Check if already claimed today
    if (playerSeason.lastLoginDate && isSameDay(playerSeason.lastLoginDate, now)) {
      return NextResponse.json(
        { error: "Daily login already claimed today" },
        { status: 400 }
      );
    }

    // Calculate streak
    let newStreak: number;
    if (
      playerSeason.lastLoginDate &&
      isConsecutiveDay(playerSeason.lastLoginDate, now)
    ) {
      newStreak = playerSeason.loginStreak + 1;
    } else {
      newStreak = 1;
    }

    // Calculate XP
    let xpAwarded = XP_SOURCES.DAILY_LOGIN;
    let streakBonus = 0;

    if (newStreak >= 7 && newStreak % 7 === 0) {
      streakBonus = XP_SOURCES.LOGIN_STREAK_7DAY_BONUS;
      xpAwarded += streakBonus;
    }

    const newXp = playerSeason.currentXp + xpAwarded;
    const config = getSeasonConfig(season.xpPerLevel);
    const newLevel = Math.min(
      levelFromXp(newXp, config.baseXp, config.increase),
      season.maxLevel
    );
    const leveledUp = newLevel > playerSeason.currentLevel;

    // Update player season and create XP events in transaction
    const xpEvents: { userId: string; seasonId: string; amount: number; source: string; metadata: { streak: number } }[] = [
      {
        userId: session.user.id,
        seasonId: season.id,
        amount: XP_SOURCES.DAILY_LOGIN,
        source: "daily_login",
        metadata: { streak: newStreak },
      },
    ];

    if (streakBonus > 0) {
      xpEvents.push({
        userId: session.user.id,
        seasonId: season.id,
        amount: streakBonus,
        source: "login_streak_bonus",
        metadata: { streak: newStreak },
      });
    }

    await prisma.$transaction([
      prisma.playerSeason.update({
        where: { id: playerSeason.id },
        data: {
          currentXp: newXp,
          currentLevel: newLevel,
          lastLoginDate: now,
          loginStreak: newStreak,
        },
      }),
      ...xpEvents.map((event) => prisma.xpEvent.create({ data: event })),
    ]);

    // Notify Discord on level up
    if (leveledUp) {
      notifyDiscordBot({
        event: "battlepass.levelup",
        userId: session.user.id,
        data: { level: newLevel, seasonName: season.name },
      });
    }

    return NextResponse.json({
      success: true,
      xpAwarded,
      streakBonus,
      newStreak,
      currentXp: newXp,
      currentLevel: newLevel,
      leveledUp,
    });
  } catch (error) {
    console.error("Daily login error:", error);
    return NextResponse.json(
      { error: "Failed to claim daily login" },
      { status: 500 }
    );
  }
}
