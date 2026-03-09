import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS || "").split(",");

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId || !ADMIN_DISCORD_IDS.includes(session.user.discordId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { serverId, wipeId } = await request.json();
  if (!serverId || !wipeId) {
    return NextResponse.json({ error: "serverId and wipeId required" }, { status: 400 });
  }

  // Get server to find its slug/serverType
  const server = await prisma.gameServer.findUnique({ where: { id: serverId } });
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  // Resolve serverType (slug vs uppercase variant)
  const slugVariants = [server.slug, server.slug.toUpperCase().replace(/-/g, "_")];

  const allStats = await prisma.wipeStats.findMany({
    where: { serverType: { in: slugVariants }, wipeId },
  });

  if (allStats.length === 0) {
    return NextResponse.json({ error: "No stats found for this server+wipe" }, { status: 404 });
  }

  const awarded: { category: string; rank: number; steamId: string; statValue: number }[] = [];

  // MOST_KILLS - top 3 by kills
  const byKills = [...allStats].sort((a, b) => b.kills - a.kills).slice(0, 3);
  for (let i = 0; i < byKills.length; i++) {
    const stat = byKills[i];
    if (stat.kills === 0) continue;
    await prisma.trophy.upsert({
      where: { steamId_serverId_wipeId_category: { steamId: stat.steamId, serverId, wipeId, category: "MOST_KILLS" } },
      update: { rank: i + 1, statValue: stat.kills },
      create: { steamId: stat.steamId, serverId, wipeId, category: "MOST_KILLS", rank: i + 1, statValue: stat.kills },
    });
    awarded.push({ category: "MOST_KILLS", rank: i + 1, steamId: stat.steamId, statValue: stat.kills });
  }

  // MOST_RESOURCES - top 3 by resourcesGathered
  const byResources = [...allStats].sort((a, b) => b.resourcesGathered - a.resourcesGathered).slice(0, 3);
  for (let i = 0; i < byResources.length; i++) {
    const stat = byResources[i];
    if (stat.resourcesGathered === 0) continue;
    await prisma.trophy.upsert({
      where: { steamId_serverId_wipeId_category: { steamId: stat.steamId, serverId, wipeId, category: "MOST_RESOURCES" } },
      update: { rank: i + 1, statValue: stat.resourcesGathered },
      create: { steamId: stat.steamId, serverId, wipeId, category: "MOST_RESOURCES", rank: i + 1, statValue: stat.resourcesGathered },
    });
    awarded.push({ category: "MOST_RESOURCES", rank: i + 1, steamId: stat.steamId, statValue: stat.resourcesGathered });
  }

  // MOST_GAMBLING_PROFIT - top 3 by scrapWon - scrapGambled
  const withProfit = allStats.map((s) => ({ ...s, profit: s.scrapWon - s.scrapGambled }));
  const byProfit = withProfit.sort((a, b) => b.profit - a.profit).slice(0, 3);
  for (let i = 0; i < byProfit.length; i++) {
    const stat = byProfit[i];
    if (stat.profit <= 0) continue;
    await prisma.trophy.upsert({
      where: { steamId_serverId_wipeId_category: { steamId: stat.steamId, serverId, wipeId, category: "MOST_GAMBLING_PROFIT" } },
      update: { rank: i + 1, statValue: stat.profit },
      create: { steamId: stat.steamId, serverId, wipeId, category: "MOST_GAMBLING_PROFIT", rank: i + 1, statValue: stat.profit },
    });
    awarded.push({ category: "MOST_GAMBLING_PROFIT", rank: i + 1, steamId: stat.steamId, statValue: stat.profit });
  }

  return NextResponse.json({ awarded });
}
