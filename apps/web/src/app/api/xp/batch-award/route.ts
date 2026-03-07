import { NextRequest, NextResponse } from "next/server";
import { prisma, SeasonStatus } from "@rustranked/database";
import { getSeasonConfig, levelFromXp } from "@/lib/xp-engine";
import { notifyDiscordBot } from "@/lib/discord-notify";

// PUT - Batch award XP to players (called by game server plugin)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, players } = body;

    // Verify API key (same pattern as stats/update)
    const expectedApiKey = process.env.STATS_API_KEY;
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Array.isArray(players)) {
      return NextResponse.json(
        { error: "players array is required" },
        { status: 400 }
      );
    }

    const season = await prisma.season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
    });

    if (!season) {
      return NextResponse.json({
        success: true,
        message: "No active season",
        updated: 0,
      });
    }

    const config = getSeasonConfig(season.xpPerLevel);
    const results: {
      steamId: string;
      newLevel: number;
      newXp: number;
      leveledUp: boolean;
    }[] = [];

    for (const player of players) {
      const { steamId, entries } = player as {
        steamId: string;
        entries: { source: string; amount: number }[];
      };

      if (!steamId || !Array.isArray(entries) || entries.length === 0) continue;

      // Find user by steamId
      const user = await prisma.user.findUnique({
        where: { steamId },
      });

      if (!user) continue;

      const totalXp = entries.reduce(
        (sum: number, e: { amount: number }) => sum + e.amount,
        0
      );
      if (totalXp <= 0) continue;

      // Find or create PlayerSeason
      let playerSeason = await prisma.playerSeason.findUnique({
        where: {
          userId_seasonId: {
            userId: user.id,
            seasonId: season.id,
          },
        },
      });

      if (!playerSeason) {
        playerSeason = await prisma.playerSeason.create({
          data: {
            userId: user.id,
            seasonId: season.id,
          },
        });
      }

      const newXp = playerSeason.currentXp + totalXp;
      const newLevel = Math.min(
        levelFromXp(newXp, config.baseXp, config.increase),
        season.maxLevel
      );
      const leveledUp = newLevel > playerSeason.currentLevel;

      // Update player season and create XP events
      await prisma.$transaction([
        prisma.playerSeason.update({
          where: { id: playerSeason.id },
          data: {
            currentXp: newXp,
            currentLevel: newLevel,
          },
        }),
        ...entries.map((entry: { source: string; amount: number }) =>
          prisma.xpEvent.create({
            data: {
              userId: user.id,
              seasonId: season.id,
              amount: entry.amount,
              source: entry.source,
            },
          })
        ),
      ]);

      if (leveledUp) {
        notifyDiscordBot({
          event: "battlepass.levelup",
          userId: user.id,
          data: { level: newLevel, seasonName: season.name },
        });
      }

      results.push({
        steamId,
        newLevel,
        newXp,
        leveledUp,
      });
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      players: results,
    });
  } catch (error) {
    console.error("XP batch award error:", error);
    return NextResponse.json(
      { error: "Failed to award XP" },
      { status: 500 }
    );
  }
}
