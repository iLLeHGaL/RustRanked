import { NextRequest, NextResponse } from "next/server";
import { prisma, SeasonStatus } from "@rustranked/database";
import { getSeasonConfig, levelFromXp, XP_SOURCES } from "@/lib/xp-engine";
import { notifyDiscordBot } from "@/lib/discord-notify";

// All stat fields that can be sent by the plugin
const STAT_FIELDS = [
  "kills", "deaths", "headshots", "bulletsFired", "bulletsHit",
  "arrowsFired", "arrowsHit", "suicides", "timesWounded",
  "woundedRecoveries", "syringesUsed", "bandagesUsed", "medkitsUsed",
  "animalKills", "npcKills",
  "rocketsLaunched", "explosivesUsed", "c4Used", "satchelsUsed", "explosiveAmmoUsed",
  "woodGathered", "stoneGathered", "metalOreGathered", "sulfurOreGathered",
  "blocksPlaced", "blocksUpgraded",
  "cratesLooted", "barrelsLooted",
  "itemsRecycled",
  "scrapGambled", "scrapWon",
  "boatsSpawned", "minisSpawned",
  "vehicleKills",
  "fishCaught",
  "hoursPlayed", "resourcesGathered",
] as const;

type StatField = (typeof STAT_FIELDS)[number];

function pickStats(source: Record<string, unknown>, mode: "update" | "create") {
  const result: Record<string, number | undefined> = {};
  for (const field of STAT_FIELDS) {
    const val = source[field];
    if (val !== undefined && val !== null) {
      result[field] = typeof val === "number" ? val : undefined;
    } else {
      result[field] = mode === "create" ? 0 : undefined;
    }
  }
  return result;
}

// POST - Update single player wipe stats (called by game server plugin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, steamId, serverType, wipeId } = body;

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

    // serverType is now any string (server slug) — no enum validation needed

    // Get previous stats for delta calculation
    const previousStats = await prisma.wipeStats.findUnique({
      where: {
        steamId_serverType_wipeId: {
          steamId,
          serverType,
          wipeId,
        },
      },
    });

    // Upsert stats (create or update)
    const stats = await prisma.wipeStats.upsert({
      where: {
        steamId_serverType_wipeId: {
          steamId,
          serverType,
          wipeId,
        },
      },
      update: pickStats(body, "update"),
      create: {
        steamId,
        serverType,
        wipeId,
        ...pickStats(body, "create"),
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

    // serverType is now any string (server slug) — no enum validation needed

    // Process each player
    const results = await Promise.all(
      players.map(async (player: Record<string, unknown>) => {
        const steamId = player.steamId as string | undefined;
        if (!steamId) return null;

        return prisma.wipeStats.upsert({
          where: {
            steamId_serverType_wipeId: {
              steamId,
              serverType,
              wipeId,
            },
          },
          update: pickStats(player, "update"),
          create: {
            steamId,
            serverType,
            wipeId,
            ...pickStats(player, "create"),
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
  animalKills: number;
  fishCaught: number;
  blocksPlaced: number;
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
      animalKills: 0,
      fishCaught: 0,
      blocksPlaced: 0,
    };

    const killsDelta = Math.max(0, current.kills - prev.kills);
    const deathsDelta = Math.max(0, current.deaths - prev.deaths);
    const headshotsDelta = Math.max(0, current.headshots - prev.headshots);
    const rocketsDelta = Math.max(0, current.rocketsLaunched - prev.rocketsLaunched);
    const explosivesDelta = Math.max(0, current.explosivesUsed - prev.explosivesUsed);
    const resourcesDelta = Math.max(0, current.resourcesGathered - prev.resourcesGathered);
    const hoursDelta = Math.max(0, current.hoursPlayed - prev.hoursPlayed);
    const animalKillsDelta = Math.max(0, current.animalKills - prev.animalKills);
    const fishDelta = Math.max(0, current.fishCaught - prev.fishCaught);
    const blocksDelta = Math.max(0, current.blocksPlaced - prev.blocksPlaced);

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

    // Animal kills XP (10 XP each)
    if (animalKillsDelta > 0) {
      xpEntries.push({ source: "animal_kill", amount: animalKillsDelta * 10 });
    }

    // Fish caught XP (5 XP each)
    if (fishDelta > 0) {
      xpEntries.push({ source: "fish", amount: fishDelta * 5 });
    }

    // Building blocks placed XP (2 XP each)
    if (blocksDelta > 0) {
      xpEntries.push({ source: "building", amount: blocksDelta * 2 });
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
