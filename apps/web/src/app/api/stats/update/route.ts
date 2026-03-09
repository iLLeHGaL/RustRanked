import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@rustranked/database";

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

