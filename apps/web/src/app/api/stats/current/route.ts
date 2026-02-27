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

const EMPTY_STATS = {
  kills: 0,
  deaths: 0,
  headshots: 0,
  bulletsFired: 0,
  bulletsHit: 0,
  arrowsFired: 0,
  arrowsHit: 0,
  rocketsLaunched: 0,
  explosivesUsed: 0,
  woodGathered: 0,
  stoneGathered: 0,
  metalOreGathered: 0,
  sulfurOreGathered: 0,
  hoursPlayed: 0,
  resourcesGathered: 0,
};

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
    take: serverType ? 1 : 4,
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
        headshots: acc.headshots + stat.headshots,
        bulletsFired: acc.bulletsFired + stat.bulletsFired,
        bulletsHit: acc.bulletsHit + stat.bulletsHit,
        arrowsFired: acc.arrowsFired + stat.arrowsFired,
        arrowsHit: acc.arrowsHit + stat.arrowsHit,
        rocketsLaunched: acc.rocketsLaunched + stat.rocketsLaunched,
        explosivesUsed: acc.explosivesUsed + stat.explosivesUsed,
        woodGathered: acc.woodGathered + stat.woodGathered,
        stoneGathered: acc.stoneGathered + stat.stoneGathered,
        metalOreGathered: acc.metalOreGathered + stat.metalOreGathered,
        sulfurOreGathered: acc.sulfurOreGathered + stat.sulfurOreGathered,
        hoursPlayed: acc.hoursPlayed + stat.hoursPlayed,
        resourcesGathered: acc.resourcesGathered + stat.resourcesGathered,
      }),
      { ...EMPTY_STATS }
    );

    return NextResponse.json({
      stats: aggregated,
      byServer: latestByServer,
    });
  }

  // Return single server stats
  const stat = stats[0];
  if (!stat) {
    return NextResponse.json({ stats: { ...EMPTY_STATS } });
  }

  return NextResponse.json({
    stats: {
      kills: stat.kills,
      deaths: stat.deaths,
      headshots: stat.headshots,
      bulletsFired: stat.bulletsFired,
      bulletsHit: stat.bulletsHit,
      arrowsFired: stat.arrowsFired,
      arrowsHit: stat.arrowsHit,
      rocketsLaunched: stat.rocketsLaunched,
      explosivesUsed: stat.explosivesUsed,
      woodGathered: stat.woodGathered,
      stoneGathered: stat.stoneGathered,
      metalOreGathered: stat.metalOreGathered,
      sulfurOreGathered: stat.sulfurOreGathered,
      hoursPlayed: stat.hoursPlayed,
      resourcesGathered: stat.resourcesGathered,
      wipeId: stat.wipeId,
      serverType: stat.serverType,
    },
  });
}
