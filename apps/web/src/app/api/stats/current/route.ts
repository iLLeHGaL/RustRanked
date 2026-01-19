import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

// Server types - matches Prisma enum
const ServerType = {
  US_MAIN: "US_MAIN",
  US_MONDAYS: "US_MONDAYS",
  EU_MAIN: "EU_MAIN",
  EU_MONDAYS: "EU_MONDAYS",
} as const;

type ServerTypeValue = (typeof ServerType)[keyof typeof ServerType];

// GET - Get current wipe stats for logged-in user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's Steam ID
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { steamId: true },
  });

  if (!user?.steamId) {
    return NextResponse.json({
      stats: null,
      message: "Steam account not linked",
    });
  }

  const { searchParams } = new URL(request.url);
  const serverType = searchParams.get("serverType") as ServerTypeValue | null;

  // Get the most recent wipe stats for each server (or specific server)
  let whereClause: { steamId: string; serverType?: ServerTypeValue } = {
    steamId: user.steamId,
  };

  if (serverType && Object.values(ServerType).includes(serverType)) {
    whereClause.serverType = serverType;
  }

  // Get most recent stats (ordered by updatedAt)
  const stats = await prisma.wipeStats.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    take: serverType ? 1 : 4, // Get latest for each server
  });

  // If getting all servers, group by server and get latest for each
  if (!serverType) {
    const latestByServer: Record<string, typeof stats[0]> = {};
    for (const stat of stats) {
      if (!latestByServer[stat.serverType]) {
        latestByServer[stat.serverType] = stat;
      }
    }

    // Aggregate stats across all servers
    const aggregated = Object.values(latestByServer).reduce(
      (acc, stat) => ({
        kills: acc.kills + stat.kills,
        deaths: acc.deaths + stat.deaths,
        hoursPlayed: acc.hoursPlayed + stat.hoursPlayed,
        resourcesGathered: acc.resourcesGathered + stat.resourcesGathered,
      }),
      { kills: 0, deaths: 0, hoursPlayed: 0, resourcesGathered: 0 }
    );

    return NextResponse.json({
      stats: aggregated,
      byServer: latestByServer,
    });
  }

  // Return single server stats
  const stat = stats[0];
  if (!stat) {
    return NextResponse.json({
      stats: { kills: 0, deaths: 0, hoursPlayed: 0, resourcesGathered: 0 },
    });
  }

  return NextResponse.json({
    stats: {
      kills: stat.kills,
      deaths: stat.deaths,
      hoursPlayed: stat.hoursPlayed,
      resourcesGathered: stat.resourcesGathered,
      wipeId: stat.wipeId,
      serverType: stat.serverType,
    },
  });
}
