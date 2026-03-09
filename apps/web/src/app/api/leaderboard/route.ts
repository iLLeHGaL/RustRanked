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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const server = searchParams.get("server") || "US_MAIN";
  const sort = (searchParams.get("sort") || "kills") as SortField;
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 100);

  if (!VALID_SORT_FIELDS.includes(sort)) {
    return NextResponse.json({ error: "Invalid sort field" }, { status: 400 });
  }

  // Find the latest wipeId for this server
  const latestWipe = await prisma.wipeStats.findFirst({
    where: { serverType: server },
    orderBy: { updatedAt: "desc" },
    select: { wipeId: true },
  });

  if (!latestWipe) {
    return NextResponse.json({ players: [], wipeId: null });
  }

  // Get top players sorted by the requested field
  const stats = await prisma.wipeStats.findMany({
    where: {
      serverType: server,
      wipeId: latestWipe.wipeId,
    },
    orderBy: { [sort]: order },
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
      // PvP
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
      // PvE
      animalKills: stat.animalKills,
      npcKills: stat.npcKills,
      // Boom
      rocketsLaunched: stat.rocketsLaunched,
      explosivesUsed: stat.explosivesUsed,
      c4Used: stat.c4Used,
      satchelsUsed: stat.satchelsUsed,
      explosiveAmmoUsed: stat.explosiveAmmoUsed,
      // Resources
      woodGathered: stat.woodGathered,
      stoneGathered: stat.stoneGathered,
      metalOreGathered: stat.metalOreGathered,
      sulfurOreGathered: stat.sulfurOreGathered,
      resourcesGathered: stat.resourcesGathered,
      // Building
      blocksPlaced: stat.blocksPlaced,
      blocksUpgraded: stat.blocksUpgraded,
      // Looting
      cratesLooted: stat.cratesLooted,
      barrelsLooted: stat.barrelsLooted,
      // Recycling
      itemsRecycled: stat.itemsRecycled,
      // Gambling
      scrapGambled: stat.scrapGambled,
      scrapWon: stat.scrapWon,
      // Vehicles
      boatsSpawned: stat.boatsSpawned,
      minisSpawned: stat.minisSpawned,
      // Vehicle Combat
      vehicleKills: stat.vehicleKills,
      // Fishing
      fishCaught: stat.fishCaught,
      // General
      hoursPlayed: stat.hoursPlayed,
    };
  });

  return NextResponse.json({
    players,
    wipeId: latestWipe.wipeId,
    server,
  });
}
