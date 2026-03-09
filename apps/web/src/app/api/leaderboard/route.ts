import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@rustranked/database";

const VALID_SORT_FIELDS = [
  // PvP
  "kills", "deaths", "headshots", "bulletsFired", "bulletsHit",
  "arrowsFired", "arrowsHit", "suicides", "timesWounded",
  "woundedRecoveries", "syringesUsed", "bandagesUsed", "medkitsUsed",
  // PvE
  "animalKills", "npcKills",
  // Raiding / Boom
  "rocketsLaunched", "explosivesUsed", "c4Used", "satchelsUsed", "explosiveAmmoUsed",
  // Resources
  "woodGathered", "stoneGathered", "metalOreGathered", "sulfurOreGathered",
  "resourcesGathered",
  // Building
  "blocksPlaced", "blocksUpgraded",
  // Looting
  "cratesLooted", "barrelsLooted",
  // Recycling
  "itemsRecycled",
  // Gambling
  "scrapGambled", "scrapWon",
  // Vehicles
  "boatsSpawned", "minisSpawned",
  // Vehicle Combat
  "vehicleKills",
  // Fishing
  "fishCaught",
  // General
  "hoursPlayed",
] as const;

type SortField = (typeof VALID_SORT_FIELDS)[number];

// Fields that can be summed in groupBy (all Int fields)
const SUMMABLE_FIELDS = VALID_SORT_FIELDS.filter((f) => f !== "hoursPlayed");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const server = searchParams.get("server") || "us-main";
  const sort = (searchParams.get("sort") || "kills") as SortField;
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 100);
  const wipeParam = searchParams.get("wipe"); // specific wipe date

  if (!VALID_SORT_FIELDS.includes(sort)) {
    return NextResponse.json({ error: "Invalid sort field" }, { status: 400 });
  }

  // Overall mode: aggregate all stats across all servers and wipes
  if (server === "overall") {
    return handleOverallMode(sort, order, limit);
  }

  // Get available wipes for this server (newest first)
  const availableWipesRaw = await prisma.wipeStats.findMany({
    where: { serverType: server },
    select: { wipeId: true },
    distinct: ["wipeId"],
    orderBy: { updatedAt: "desc" },
  });

  const availableWipes = availableWipesRaw.map((w) => w.wipeId);

  if (availableWipes.length === 0) {
    return NextResponse.json({ players: [], wipeId: null, server, availableWipes: [] });
  }

  // Use requested wipe or fall back to latest
  const wipeId = wipeParam && availableWipes.includes(wipeParam)
    ? wipeParam
    : availableWipes[0];

  // Get top players sorted by the requested field
  const stats = await prisma.wipeStats.findMany({
    where: {
      serverType: server,
      wipeId,
    },
    orderBy: { [sort]: order },
    take: limit,
  });

  // Get user info
  const steamIds = stats.map((s) => s.steamId);
  const users = steamIds.length > 0
    ? await prisma.user.findMany({
        where: { steamId: { in: steamIds } },
        select: {
          steamId: true,
          discordName: true,
          discordAvatar: true,
          steamName: true,
        },
      })
    : [];

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
      bulletsFired: stat.bulletsFired,
      bulletsHit: stat.bulletsHit,
      arrowsFired: stat.arrowsFired,
      arrowsHit: stat.arrowsHit,
      suicides: stat.suicides,
      timesWounded: stat.timesWounded,
      woundedRecoveries: stat.woundedRecoveries,
      syringesUsed: stat.syringesUsed,
      bandagesUsed: stat.bandagesUsed,
      medkitsUsed: stat.medkitsUsed,
      animalKills: stat.animalKills,
      npcKills: stat.npcKills,
      rocketsLaunched: stat.rocketsLaunched,
      explosivesUsed: stat.explosivesUsed,
      c4Used: stat.c4Used,
      satchelsUsed: stat.satchelsUsed,
      explosiveAmmoUsed: stat.explosiveAmmoUsed,
      woodGathered: stat.woodGathered,
      stoneGathered: stat.stoneGathered,
      metalOreGathered: stat.metalOreGathered,
      sulfurOreGathered: stat.sulfurOreGathered,
      resourcesGathered: stat.resourcesGathered,
      blocksPlaced: stat.blocksPlaced,
      blocksUpgraded: stat.blocksUpgraded,
      cratesLooted: stat.cratesLooted,
      barrelsLooted: stat.barrelsLooted,
      itemsRecycled: stat.itemsRecycled,
      scrapGambled: stat.scrapGambled,
      scrapWon: stat.scrapWon,
      boatsSpawned: stat.boatsSpawned,
      minisSpawned: stat.minisSpawned,
      vehicleKills: stat.vehicleKills,
      fishCaught: stat.fishCaught,
      hoursPlayed: stat.hoursPlayed,
    };
  });

  return NextResponse.json({
    players,
    wipeId,
    server,
    availableWipes,
  });
}

async function handleOverallMode(sort: SortField, order: "asc" | "desc", limit: number) {
  // Build the _sum object for groupBy
  const sumFields: Record<string, boolean> = {};
  for (const field of SUMMABLE_FIELDS) {
    sumFields[field] = true;
  }
  // hoursPlayed is Float, also summable
  sumFields["hoursPlayed"] = true;

  const grouped = await prisma.wipeStats.groupBy({
    by: ["steamId"],
    _sum: sumFields as Record<string, true>,
    orderBy: { _sum: { [sort]: order } },
    take: limit,
  });

  // Get user info
  const steamIds = grouped.map((g) => g.steamId);
  const users = steamIds.length > 0
    ? await prisma.user.findMany({
        where: { steamId: { in: steamIds } },
        select: {
          steamId: true,
          discordName: true,
          discordAvatar: true,
          steamName: true,
        },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.steamId, u]));

  const players = grouped.map((g) => {
    const user = userMap.get(g.steamId);
    const s = g._sum as Record<string, number | null>;
    return {
      steamId: g.steamId,
      name: user?.steamName || user?.discordName || g.steamId,
      avatar: user?.discordAvatar || null,
      kills: s.kills ?? 0,
      deaths: s.deaths ?? 0,
      headshots: s.headshots ?? 0,
      bulletsFired: s.bulletsFired ?? 0,
      bulletsHit: s.bulletsHit ?? 0,
      arrowsFired: s.arrowsFired ?? 0,
      arrowsHit: s.arrowsHit ?? 0,
      suicides: s.suicides ?? 0,
      timesWounded: s.timesWounded ?? 0,
      woundedRecoveries: s.woundedRecoveries ?? 0,
      syringesUsed: s.syringesUsed ?? 0,
      bandagesUsed: s.bandagesUsed ?? 0,
      medkitsUsed: s.medkitsUsed ?? 0,
      animalKills: s.animalKills ?? 0,
      npcKills: s.npcKills ?? 0,
      rocketsLaunched: s.rocketsLaunched ?? 0,
      explosivesUsed: s.explosivesUsed ?? 0,
      c4Used: s.c4Used ?? 0,
      satchelsUsed: s.satchelsUsed ?? 0,
      explosiveAmmoUsed: s.explosiveAmmoUsed ?? 0,
      woodGathered: s.woodGathered ?? 0,
      stoneGathered: s.stoneGathered ?? 0,
      metalOreGathered: s.metalOreGathered ?? 0,
      sulfurOreGathered: s.sulfurOreGathered ?? 0,
      resourcesGathered: s.resourcesGathered ?? 0,
      blocksPlaced: s.blocksPlaced ?? 0,
      blocksUpgraded: s.blocksUpgraded ?? 0,
      cratesLooted: s.cratesLooted ?? 0,
      barrelsLooted: s.barrelsLooted ?? 0,
      itemsRecycled: s.itemsRecycled ?? 0,
      scrapGambled: s.scrapGambled ?? 0,
      scrapWon: s.scrapWon ?? 0,
      boatsSpawned: s.boatsSpawned ?? 0,
      minisSpawned: s.minisSpawned ?? 0,
      vehicleKills: s.vehicleKills ?? 0,
      fishCaught: s.fishCaught ?? 0,
      hoursPlayed: s.hoursPlayed ?? 0,
    };
  });

  return NextResponse.json({
    players,
    wipeId: null,
    server: "overall",
    availableWipes: [],
  });
}
