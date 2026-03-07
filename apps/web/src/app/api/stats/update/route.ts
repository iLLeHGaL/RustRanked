import { NextRequest, NextResponse } from "next/server";
import { prisma, SeasonStatus } from "@rustranked/database";
import { getSeasonConfig, levelFromXp, XP_SOURCES } from "@/lib/xp-engine";
import { notifyDiscordBot } from "@/lib/discord-notify";

// Server types - matches Prisma enum
const ServerType = {
  US_MAIN: "US_MAIN",
  US_MONDAYS: "US_MONDAYS",
  EU_MAIN: "EU_MAIN",
  EU_MONDAYS: "EU_MONDAYS",
} as const;

type ServerTypeValue = (typeof ServerType)[keyof typeof ServerType];

// POST - Update single player wipe stats (called by game server plugin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      apiKey,
      steamId,
      serverType,
      wipeId,
      kills,
      deaths,
      headshots,
      bulletsFired,
      bulletsHit,
      arrowsFired,
      arrowsHit,
      rocketsLaunched,
      explosivesUsed,
      woodGathered,
      stoneGathered,
      metalOreGathered,
      sulfurOreGathered,
      hoursPlayed,
      resourcesGathered,
    } = body;

    // Verify API key
    const expectedApiKey = process.env.STATS_API_KEY;
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    if (!steamId || !serverType || !wipeId) {
      return NextResponse.json(
        { error: "steamId, serverType, and wipeId are required" },
        { status: 400 }
      );
    }

    // Validate server type
    if (!Object.values(ServerType).includes(serverType as ServerTypeValue)) {
      return NextResponse.json(
        { error: "Invalid serverType" },
        { status: 400 }
      );
    }

    // Get previous stats for delta calculation
    const previousStats = await prisma.wipeStats.findUnique({
      where: {
        steamId_serverType_wipeId: {
          steamId,
          serverType: serverType as ServerTypeValue,
          wipeId,
        },
      },
    });

    // Upsert stats (create or update)
    const stats = await prisma.wipeStats.upsert({
      where: {
        steamId_serverType_wipeId: {
          steamId,
          serverType: serverType as ServerTypeValue,
          wipeId,
        },
      },
      update: {
        kills: kills ?? undefined,
        deaths: deaths ?? undefined,
        headshots: headshots ?? undefined,
        bulletsFired: bulletsFired ?? undefined,
        bulletsHit: bulletsHit ?? undefined,
        arrowsFired: arrowsFired ?? undefined,
        arrowsHit: arrowsHit ?? undefined,
        rocketsLaunched: rocketsLaunched ?? undefined,
        explosivesUsed: explosivesUsed ?? undefined,
        woodGathered: woodGathered ?? undefined,
        stoneGathered: stoneGathered ?? undefined,
        metalOreGathered: metalOreGathered ?? undefined,
        sulfurOreGathered: sulfurOreGathered ?? undefined,
        hoursPlayed: hoursPlayed ?? undefined,
        resourcesGathered: resourcesGathered ?? undefined,
      },
      create: {
        steamId,
        serverType: serverType as ServerTypeValue,
        wipeId,
        kills: kills ?? 0,
        deaths: deaths ?? 0,
        headshots: headshots ?? 0,
        bulletsFired: bulletsFired ?? 0,
        bulletsHit: bulletsHit ?? 0,
        arrowsFired: arrowsFired ?? 0,
        arrowsHit: arrowsHit ?? 0,
        rocketsLaunched: rocketsLaunched ?? 0,
        explosivesUsed: explosivesUsed ?? 0,
        woodGathered: woodGathered ?? 0,
        stoneGathered: stoneGathered ?? 0,
        metalOreGathered: metalOreGathered ?? 0,
        sulfurOreGathered: sulfurOreGathered ?? 0,
        hoursPlayed: hoursPlayed ?? 0,
        resourcesGathered: resourcesGathered ?? 0,
      },
    });

    // Calculate and award XP from stat deltas
    await awardXpFromStatDeltas(steamId, previousStats, stats);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Stats update error:", error);
    return NextResponse.json(
      { error: "Failed to update stats" },
      { status: 500 }
    );
  }
}

// PUT - Batch update multiple players at once
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, wipeId, serverType, players } = body;

    // Verify API key
    const expectedApiKey = process.env.STATS_API_KEY;
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    if (!wipeId || !serverType || !Array.isArray(players)) {
      return NextResponse.json(
        { error: "wipeId, serverType, and players array are required" },
        { status: 400 }
      );
    }

    // Validate server type
    if (!Object.values(ServerType).includes(serverType as ServerTypeValue)) {
      return NextResponse.json(
        { error: "Invalid serverType" },
        { status: 400 }
      );
    }

    // Process each player
    const results = await Promise.all(
      players.map(async (player: {
        steamId: string;
        kills?: number;
        deaths?: number;
        headshots?: number;
        bulletsFired?: number;
        bulletsHit?: number;
        arrowsFired?: number;
        arrowsHit?: number;
        rocketsLaunched?: number;
        explosivesUsed?: number;
        woodGathered?: number;
        stoneGathered?: number;
        metalOreGathered?: number;
        sulfurOreGathered?: number;
        hoursPlayed?: number;
        resourcesGathered?: number;
      }) => {
        if (!player.steamId) return null;

        return prisma.wipeStats.upsert({
          where: {
            steamId_serverType_wipeId: {
              steamId: player.steamId,
              serverType: serverType as ServerTypeValue,
              wipeId,
            },
          },
          update: {
            kills: player.kills ?? undefined,
            deaths: player.deaths ?? undefined,
            headshots: player.headshots ?? undefined,
            bulletsFired: player.bulletsFired ?? undefined,
            bulletsHit: player.bulletsHit ?? undefined,
            arrowsFired: player.arrowsFired ?? undefined,
            arrowsHit: player.arrowsHit ?? undefined,
            rocketsLaunched: player.rocketsLaunched ?? undefined,
            explosivesUsed: player.explosivesUsed ?? undefined,
            woodGathered: player.woodGathered ?? undefined,
            stoneGathered: player.stoneGathered ?? undefined,
            metalOreGathered: player.metalOreGathered ?? undefined,
            sulfurOreGathered: player.sulfurOreGathered ?? undefined,
            hoursPlayed: player.hoursPlayed ?? undefined,
            resourcesGathered: player.resourcesGathered ?? undefined,
          },
          create: {
            steamId: player.steamId,
            serverType: serverType as ServerTypeValue,
            wipeId,
            kills: player.kills ?? 0,
            deaths: player.deaths ?? 0,
            headshots: player.headshots ?? 0,
            bulletsFired: player.bulletsFired ?? 0,
            bulletsHit: player.bulletsHit ?? 0,
            arrowsFired: player.arrowsFired ?? 0,
            arrowsHit: player.arrowsHit ?? 0,
            rocketsLaunched: player.rocketsLaunched ?? 0,
            explosivesUsed: player.explosivesUsed ?? 0,
            woodGathered: player.woodGathered ?? 0,
            stoneGathered: player.stoneGathered ?? 0,
            metalOreGathered: player.metalOreGathered ?? 0,
            sulfurOreGathered: player.sulfurOreGathered ?? 0,
            hoursPlayed: player.hoursPlayed ?? 0,
            resourcesGathered: player.resourcesGathered ?? 0,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      updated: results.filter(Boolean).length,
    });
  } catch (error) {
    console.error("Batch stats update error:", error);
    return NextResponse.json(
      { error: "Failed to update stats" },
      { status: 500 }
    );
  }
}

// ============================================
// XP CALCULATION FROM STAT DELTAS
// ============================================

interface StatRecord {
  kills: number;
  deaths: number;
  headshots: number;
  rocketsLaunched: number;
  explosivesUsed: number;
  resourcesGathered: number;
  hoursPlayed: number;
}

async function awardXpFromStatDeltas(
  steamId: string,
  previous: StatRecord | null,
  current: StatRecord
) {
  try {
    const season = await prisma.season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
    });
    if (!season) return;

    const user = await prisma.user.findUnique({ where: { steamId } });
    if (!user) return;

    // Calculate deltas
    const prev = previous || {
      kills: 0,
      deaths: 0,
      headshots: 0,
      rocketsLaunched: 0,
      explosivesUsed: 0,
      resourcesGathered: 0,
      hoursPlayed: 0,
    };

    const killsDelta = Math.max(0, current.kills - prev.kills);
    const deathsDelta = Math.max(0, current.deaths - prev.deaths);
    const headshotsDelta = Math.max(0, current.headshots - prev.headshots);
    const rocketsDelta = Math.max(0, current.rocketsLaunched - prev.rocketsLaunched);
    const explosivesDelta = Math.max(0, current.explosivesUsed - prev.explosivesUsed);
    const resourcesDelta = Math.max(0, current.resourcesGathered - prev.resourcesGathered);
    const hoursDelta = Math.max(0, current.hoursPlayed - prev.hoursPlayed);

    // Build XP entries
    const xpEntries: { source: string; amount: number }[] = [];

    // Kill XP (headshot kills get bonus)
    const normalKills = Math.max(0, killsDelta - headshotsDelta);
    if (normalKills > 0) {
      xpEntries.push({ source: "kill", amount: normalKills * XP_SOURCES.KILL });
    }
    if (headshotsDelta > 0) {
      xpEntries.push({
        source: "headshot_kill",
        amount: headshotsDelta * (XP_SOURCES.KILL + XP_SOURCES.HEADSHOT_BONUS),
      });
    }

    // Death XP
    if (deathsDelta > 0) {
      xpEntries.push({ source: "death", amount: deathsDelta * XP_SOURCES.DEATH });
    }

    // Raiding XP
    if (rocketsDelta > 0) {
      xpEntries.push({ source: "rocket", amount: rocketsDelta * XP_SOURCES.ROCKET_USED });
    }
    if (explosivesDelta > 0) {
      xpEntries.push({ source: "explosive", amount: explosivesDelta * XP_SOURCES.EXPLOSIVE_USED });
    }

    // Resource XP (per 1000 gathered)
    const resourceBatches = Math.floor(resourcesDelta / 1000);
    if (resourceBatches > 0) {
      xpEntries.push({
        source: "resources",
        amount: resourceBatches * XP_SOURCES.RESOURCES_PER_1000,
      });
    }

    // Playtime XP (capped at 1000/day = 10 hours)
    if (hoursDelta > 0) {
      const playtimeXp = Math.min(
        Math.floor(hoursDelta * XP_SOURCES.PLAYTIME_PER_HOUR),
        XP_SOURCES.PLAYTIME_DAILY_CAP
      );
      if (playtimeXp > 0) {
        xpEntries.push({ source: "playtime", amount: playtimeXp });
      }
    }

    if (xpEntries.length === 0) return;

    const totalXp = xpEntries.reduce((sum, e) => sum + e.amount, 0);

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
    const config = getSeasonConfig(season.xpPerLevel);
    const newLevel = Math.min(
      levelFromXp(newXp, config.baseXp, config.increase),
      season.maxLevel
    );
    const leveledUp = newLevel > playerSeason.currentLevel;

    await prisma.$transaction([
      prisma.playerSeason.update({
        where: { id: playerSeason.id },
        data: {
          currentXp: newXp,
          currentLevel: newLevel,
        },
      }),
      ...xpEntries.map((entry) =>
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
  } catch (error) {
    // XP award is non-critical, don't fail the stats update
    console.error("XP award from stats error:", error);
  }
}
