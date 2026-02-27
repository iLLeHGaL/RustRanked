import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@rustranked/database";

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
