import { NextRequest, NextResponse } from "next/server";
import { prisma, ServerType } from "@rustranked/database";

const VALID_SERVER_TYPES = ["US_MAIN", "US_MONDAYS", "EU_MAIN", "EU_MONDAYS"] as const;
const VALID_SORT_FIELDS = ["kills", "deaths", "headshots", "hoursPlayed"] as const;

type SortField = (typeof VALID_SORT_FIELDS)[number];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const server = searchParams.get("server") || "US_MAIN";
  const sort = (searchParams.get("sort") || "kills") as SortField;
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 100);

  if (!VALID_SERVER_TYPES.includes(server as (typeof VALID_SERVER_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid server type" }, { status: 400 });
  }

  if (!VALID_SORT_FIELDS.includes(sort)) {
    return NextResponse.json({ error: "Invalid sort field" }, { status: 400 });
  }

  // Find the latest wipeId for this server
  const latestWipe = await prisma.wipeStats.findFirst({
    where: { serverType: server as ServerType },
    orderBy: { updatedAt: "desc" },
    select: { wipeId: true },
  });

  if (!latestWipe) {
    return NextResponse.json({ players: [], wipeId: null });
  }

  // Get top players sorted by the requested field
  const stats = await prisma.wipeStats.findMany({
    where: {
      serverType: server as ServerType,
      wipeId: latestWipe.wipeId,
    },
    orderBy: { [sort]: "desc" },
    take: limit,
  });

  // Get user info
  const steamIds = stats.map((s) => s.steamId);
  const users = await prisma.user.findMany({
    where: { steamId: { in: steamIds } },
    select: {
      steamId: true,
      discordName: true,
      discordAvatar: true,
      steamName: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.steamId, u]));

  const players = stats.map((stat) => {
    const user = userMap.get(stat.steamId);
    return {
      steamId: stat.steamId,
      name: user?.steamName || user?.discordName || stat.steamId,
      avatar: user?.discordAvatar || null,
      kills: stat.kills,
      deaths: stat.deaths,
      headshots: stat.headshots,
      hoursPlayed: stat.hoursPlayed,
      bulletsFired: stat.bulletsFired,
      bulletsHit: stat.bulletsHit,
      rocketsLaunched: stat.rocketsLaunched,
      explosivesUsed: stat.explosivesUsed,
    };
  });

  return NextResponse.json({
    players,
    wipeId: latestWipe.wipeId,
    server,
  });
}
