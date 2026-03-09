import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

const EMPTY_STATS = {
  kills: 0,
  deaths: 0,
  headshots: 0,
  bulletsFired: 0,
  bulletsHit: 0,
  arrowsFired: 0,
  arrowsHit: 0,
  suicides: 0,
  timesWounded: 0,
  woundedRecoveries: 0,
  syringesUsed: 0,
  bandagesUsed: 0,
  medkitsUsed: 0,
  animalKills: 0,
  npcKills: 0,
  rocketsLaunched: 0,
  explosivesUsed: 0,
  c4Used: 0,
  satchelsUsed: 0,
  explosiveAmmoUsed: 0,
  woodGathered: 0,
  stoneGathered: 0,
  metalOreGathered: 0,
  sulfurOreGathered: 0,
  blocksPlaced: 0,
  blocksUpgraded: 0,
  cratesLooted: 0,
  barrelsLooted: 0,
  itemsRecycled: 0,
  scrapGambled: 0,
  scrapWon: 0,
  boatsSpawned: 0,
  minisSpawned: 0,
  vehicleKills: 0,
  fishCaught: 0,
  hoursPlayed: 0,
  resourcesGathered: 0,
};

type StatsShape = typeof EMPTY_STATS;
const STAT_KEYS = Object.keys(EMPTY_STATS) as (keyof StatsShape)[];

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
  const serverType = searchParams.get("serverType");

  // Get the most recent wipe stats for each server (or specific server)
  const whereClause: { steamId: string; serverType?: string } = {
    steamId: user.steamId,
  };

  if (serverType) {
    whereClause.serverType = serverType;
  }

  // Get most recent stats (ordered by updatedAt)
  const stats = await prisma.wipeStats.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    take: serverType ? 1 : 20,
  });

  // If getting all servers, group by server and get latest for each
  if (!serverType) {
    const latestByServer: Record<string, (typeof stats)[0]> = {};
    for (const stat of stats) {
      if (!latestByServer[stat.serverType]) {
        latestByServer[stat.serverType] = stat;
      }
    }

    // Aggregate stats across all servers
    const aggregated = Object.values(latestByServer).reduce(
      (acc, stat) => {
        const result = { ...acc };
        for (const key of STAT_KEYS) {
          (result as Record<string, number>)[key] =
            (acc[key] as number) + (stat[key] as number);
        }
        return result;
      },
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

  const result: Record<string, unknown> = {};
  for (const key of STAT_KEYS) {
    result[key] = stat[key];
  }
  result.wipeId = stat.wipeId;
  result.serverType = stat.serverType;

  return NextResponse.json({ stats: result });
}
