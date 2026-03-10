import { prisma } from "@rustranked/database";
import { Navbar } from "@/components/navbar";
import { HallOfFameContent } from "./hall-of-fame-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hall of Fame - RustRanked",
};

export default async function HallOfFamePage() {
  // Get all active public servers
  const servers = await prisma.gameServer.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, region: true, slug: true },
  });

  // Get the most recent champion (rank 1, MOST_KILLS) per server
  const champions = await prisma.trophy.findMany({
    where: { rank: 1, category: "MOST_KILLS" },
    orderBy: { createdAt: "desc" },
    include: {
      server: { select: { id: true, name: true } },
    },
  });

  // Dedupe to most recent per server
  const serverChampionMap = new Map<string, typeof champions[0]>();
  for (const trophy of champions) {
    if (!serverChampionMap.has(trophy.serverId)) {
      serverChampionMap.set(trophy.serverId, trophy);
    }
  }

  // Fetch champion user details
  const championSteamIds = [...new Set([...serverChampionMap.values()].map((t) => t.steamId))];
  const championUsers = await prisma.user.findMany({
    where: { steamId: { in: championSteamIds } },
    select: { steamId: true, steamName: true, discordName: true, discordAvatar: true },
  });
  const userMap = new Map(championUsers.map((u) => [u.steamId, u]));

  const serverChampions = servers.map((server) => {
    const trophy = serverChampionMap.get(server.id);
    const user = trophy ? userMap.get(trophy.steamId) : null;
    return {
      serverName: server.name,
      region: server.region,
      champion: trophy && user
        ? {
            steamId: trophy.steamId,
            steamName: user.steamName,
            discordName: user.discordName,
            discordAvatar: user.discordAvatar,
            kills: trophy.statValue,
            wipeId: trophy.wipeId,
          }
        : null,
    };
  });

  // Get most decorated players: group trophies by steamId, count totals
  const trophyCounts = await prisma.trophy.groupBy({
    by: ["steamId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  // Get all trophies for these players to compute breakdowns
  const topSteamIds = trophyCounts.map((t) => t.steamId);
  const [topUsers, topTrophies] = await Promise.all([
    prisma.user.findMany({
      where: { steamId: { in: topSteamIds } },
      select: { steamId: true, steamName: true, discordName: true, discordAvatar: true },
    }),
    prisma.trophy.findMany({
      where: { steamId: { in: topSteamIds } },
      select: { steamId: true, rank: true, category: true },
    }),
  ]);

  const topUserMap = new Map(topUsers.map((u) => [u.steamId, u]));

  // Compute breakdowns
  const breakdownMap = new Map<string, { champion: number; gold: number; silver: number; bronze: number }>();
  for (const t of topTrophies) {
    const b = breakdownMap.get(t.steamId) ?? { champion: 0, gold: 0, silver: 0, bronze: 0 };
    if (t.rank === 1 && t.category === "MOST_KILLS") b.champion++;
    if (t.rank === 1) b.gold++;
    if (t.rank === 2) b.silver++;
    if (t.rank === 3) b.bronze++;
    breakdownMap.set(t.steamId, b);
  }

  const decoratedPlayers = trophyCounts.map((tc, i) => {
    const user = topUserMap.get(tc.steamId);
    const breakdown = breakdownMap.get(tc.steamId) ?? { champion: 0, gold: 0, silver: 0, bronze: 0 };
    return {
      rank: i + 1,
      steamId: tc.steamId,
      steamName: user?.steamName ?? null,
      discordName: user?.discordName ?? tc.steamId,
      discordAvatar: user?.discordAvatar ?? null,
      totalTrophies: tc._count.id,
      ...breakdown,
    };
  });

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <HallOfFameContent
        serverChampions={serverChampions}
        decoratedPlayers={decoratedPlayers}
      />
    </div>
  );
}
