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

// POST - Update player wipe stats (called by game server plugin)
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
        hoursPlayed: hoursPlayed ?? undefined,
        resourcesGathered: resourcesGathered ?? undefined,
      },
      create: {
        steamId,
        serverType: serverType as ServerTypeValue,
        wipeId,
        kills: kills ?? 0,
        deaths: deaths ?? 0,
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

// POST batch update - Update multiple players at once
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
            hoursPlayed: player.hoursPlayed ?? undefined,
            resourcesGathered: player.resourcesGathered ?? undefined,
          },
          create: {
            steamId: player.steamId,
            serverType: serverType as ServerTypeValue,
            wipeId,
            kills: player.kills ?? 0,
            deaths: player.deaths ?? 0,
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
