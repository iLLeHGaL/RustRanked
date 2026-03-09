import Link from "next/link";
import Image from "next/image";
import { prisma } from "@rustranked/database";
import { Trophy, Medal, Award, User, ChevronDown, ChevronUp } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getKDRatio } from "@/lib/utils";

export const revalidate = 60;

// ============================================
// CATEGORY DEFINITIONS
// ============================================

interface ColumnDef {
  key: string;
  label: string;
  sortable: boolean;
  compute?: (p: PlayerData) => string;
}

interface CategoryDef {
  key: string;
  label: string;
  defaultSort: string;
  columns: ColumnDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "pvp",
    label: "PvP",
    defaultSort: "kills",
    columns: [
      { key: "kills", label: "Kills", sortable: true },
      { key: "deaths", label: "Deaths", sortable: true },
      { key: "kd", label: "K/D", sortable: false, compute: (p) => getKDRatio(p.kills, p.deaths) },
      { key: "headshots", label: "HS", sortable: true },
      { key: "hsPercent", label: "HS%", sortable: false, compute: (p) => p.kills > 0 ? ((p.headshots / p.kills) * 100).toFixed(1) + "%" : "0%" },
      { key: "suicides", label: "Suicides", sortable: true },
      { key: "timesWounded", label: "Wounded", sortable: true },
      { key: "woundedRecoveries", label: "Recoveries", sortable: true },
    ],
  },
  {
    key: "healing",
    label: "Healing",
    defaultSort: "syringesUsed",
    columns: [
      { key: "syringesUsed", label: "Syringes", sortable: true },
      { key: "bandagesUsed", label: "Bandages", sortable: true },
      { key: "medkitsUsed", label: "Medkits", sortable: true },
    ],
  },
  {
    key: "pve",
    label: "PvE",
    defaultSort: "animalKills",
    columns: [
      { key: "animalKills", label: "Animals", sortable: true },
      { key: "npcKills", label: "NPCs", sortable: true },
    ],
  },
  {
    key: "accuracy",
    label: "Accuracy",
    defaultSort: "bulletsHit",
    columns: [
      { key: "bulletsFired", label: "Shots", sortable: true },
      { key: "bulletsHit", label: "Hits", sortable: true },
      { key: "accuracy", label: "Acc%", sortable: false, compute: (p) => p.bulletsFired > 0 ? ((p.bulletsHit / p.bulletsFired) * 100).toFixed(1) + "%" : "0%" },
      { key: "arrowsFired", label: "Arrows", sortable: true },
      { key: "arrowsHit", label: "Arrow Hits", sortable: true },
    ],
  },
  {
    key: "resources",
    label: "Resources",
    defaultSort: "resourcesGathered",
    columns: [
      { key: "resourcesGathered", label: "Total", sortable: true },
      { key: "woodGathered", label: "Wood", sortable: true },
      { key: "stoneGathered", label: "Stone", sortable: true },
      { key: "metalOreGathered", label: "Metal", sortable: true },
      { key: "sulfurOreGathered", label: "Sulfur", sortable: true },
    ],
  },
  {
    key: "boom",
    label: "Boom",
    defaultSort: "explosivesUsed",
    columns: [
      { key: "totalBoom", label: "Total", sortable: false, compute: (p) => (p.rocketsLaunched + p.c4Used + p.satchelsUsed + p.explosiveAmmoUsed).toLocaleString() },
      { key: "rocketsLaunched", label: "Rockets", sortable: true },
      { key: "c4Used", label: "C4", sortable: true },
      { key: "satchelsUsed", label: "Satchels", sortable: true },
      { key: "explosiveAmmoUsed", label: "Explo Ammo", sortable: true },
    ],
  },
  {
    key: "building",
    label: "Building",
    defaultSort: "blocksPlaced",
    columns: [
      { key: "blocksPlaced", label: "Placed", sortable: true },
      { key: "blocksUpgraded", label: "Upgraded", sortable: true },
    ],
  },
  {
    key: "looting",
    label: "Looting",
    defaultSort: "cratesLooted",
    columns: [
      { key: "cratesLooted", label: "Crates", sortable: true },
      { key: "barrelsLooted", label: "Barrels", sortable: true },
    ],
  },
  {
    key: "gambling",
    label: "Gambling",
    defaultSort: "scrapGambled",
    columns: [
      { key: "scrapGambled", label: "Gambled", sortable: true },
      { key: "scrapWon", label: "Won", sortable: true },
      { key: "netProfit", label: "Net", sortable: false, compute: (p) => (p.scrapWon - p.scrapGambled).toLocaleString() },
    ],
  },
  {
    key: "vehicles",
    label: "Vehicles",
    defaultSort: "boatsSpawned",
    columns: [
      { key: "boatsSpawned", label: "Boats", sortable: true },
      { key: "minisSpawned", label: "Minis", sortable: true },
      { key: "vehicleKills", label: "Vehicle Kills", sortable: true },
    ],
  },
  {
    key: "recycling",
    label: "Recycling",
    defaultSort: "itemsRecycled",
    columns: [
      { key: "itemsRecycled", label: "Recycled", sortable: true },
    ],
  },
  {
    key: "fishing",
    label: "Fishing",
    defaultSort: "fishCaught",
    columns: [
      { key: "fishCaught", label: "Fish", sortable: true },
    ],
  },
];

// ============================================
// TYPES
// ============================================

interface PlayerData {
  steamId: string;
  name: string;
  avatar: string | null;
  kills: number;
  deaths: number;
  headshots: number;
  bulletsFired: number;
  bulletsHit: number;
  arrowsFired: number;
  arrowsHit: number;
  suicides: number;
  timesWounded: number;
  woundedRecoveries: number;
  syringesUsed: number;
  bandagesUsed: number;
  medkitsUsed: number;
  animalKills: number;
  npcKills: number;
  rocketsLaunched: number;
  explosivesUsed: number;
  c4Used: number;
  satchelsUsed: number;
  explosiveAmmoUsed: number;
  woodGathered: number;
  stoneGathered: number;
  metalOreGathered: number;
  sulfurOreGathered: number;
  resourcesGathered: number;
  blocksPlaced: number;
  blocksUpgraded: number;
  cratesLooted: number;
  barrelsLooted: number;
  itemsRecycled: number;
  scrapGambled: number;
  scrapWon: number;
  boatsSpawned: number;
  minisSpawned: number;
  vehicleKills: number;
  fishCaught: number;
  hoursPlayed: number;
}

interface ServerInfo {
  slug: string;
  name: string;
  region: string;
}

// ============================================
// PAGE
// ============================================

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ server?: string; category?: string; sort?: string; order?: string }>;
}) {
  const params = await searchParams;

  // Fetch public servers grouped by region
  const servers = await prisma.gameServer.findMany({
    where: { isActive: true, isPublic: true },
    select: { slug: true, name: true, region: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  const serverSlugs = servers.map((s) => s.slug);

  // Determine active server
  const serverSlug = serverSlugs.includes(params.server ?? "")
    ? params.server!
    : serverSlugs[0] ?? "US_MAIN";

  // Determine active category
  const category = CATEGORIES.find((c) => c.key === params.category) || CATEGORIES[0];

  // Determine sort
  const sortField = params.sort && category.columns.some((c) => c.key === params.sort && c.sortable)
    ? params.sort
    : category.defaultSort;
  const sortOrder = params.order === "asc" ? "asc" : "desc";

  // Find the latest wipeId for this server
  const latestWipe = await prisma.wipeStats.findFirst({
    where: { serverType: serverSlug },
    orderBy: { updatedAt: "desc" },
    select: { wipeId: true },
  });

  const wipeId = latestWipe?.wipeId;

  // Get top 100 players
  const topPlayers = wipeId
    ? await prisma.wipeStats.findMany({
        where: {
          serverType: serverSlug,
          wipeId,
        },
        orderBy: { [sortField]: sortOrder },
        take: 100,
      })
    : [];

  // Get user info
  const steamIds = topPlayers.map((p) => p.steamId);
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

  const playerData: PlayerData[] = topPlayers.map((stat) => {
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

  // Group servers by region
  const regions = new Map<string, ServerInfo[]>();
  for (const s of servers) {
    const list = regions.get(s.region) || [];
    list.push(s);
    regions.set(s.region, list);
  }

  function buildUrl(overrides: Record<string, string>) {
    const base: Record<string, string> = {
      server: serverSlug,
      category: category.key,
      sort: sortField,
      order: sortOrder,
    };
    const merged = { ...base, ...overrides };
    const qs = new URLSearchParams(merged).toString();
    return `/leaderboard?${qs}`;
  }

  function sortUrl(colKey: string) {
    if (colKey === sortField) {
      return buildUrl({ sort: colKey, order: sortOrder === "desc" ? "asc" : "desc" });
    }
    return buildUrl({ sort: colKey, order: "desc" });
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-rust-500" />
            Leaderboard
          </h1>
          <p className="text-zinc-400">
            Top players for the current wipe
            {wipeId && (
              <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                Wipe: {wipeId}
              </span>
            )}
          </p>
        </div>

        {/* Server Tabs by Region */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-4">
            {Array.from(regions.entries()).map(([region, regionServers]) => (
              <div key={region} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {region}
                </span>
                <div className="flex gap-1">
                  {regionServers.map((s) => (
                    <Link
                      key={s.slug}
                      href={buildUrl({ server: s.slug, sort: category.defaultSort, order: "desc" })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        serverSlug === s.slug
                          ? "bg-rust-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                      }`}
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={buildUrl({ category: cat.key, sort: cat.defaultSort, order: "desc" })}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                category.key === cat.key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Leaderboard Table */}
        {playerData.length === 0 ? (
          <div className="card text-center py-12">
            <Trophy className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No stats recorded for this server yet.</p>
            <p className="text-sm text-zinc-500 mt-2">
              Stats will appear once the wipe starts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-sm text-zinc-500">
                  <th className="pb-3 pr-4 w-12">#</th>
                  <th className="pb-3 pr-4">Player</th>
                  {category.columns.map((col) => (
                    <th key={col.key} className="pb-3 pr-4 text-right">
                      {col.sortable ? (
                        <Link
                          href={sortUrl(col.key)}
                          className="inline-flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {col.label}
                          {sortField === col.key ? (
                            sortOrder === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5 text-rust-500" />
                            ) : (
                              <ChevronUp className="h-3.5 w-3.5 text-rust-500" />
                            )
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-30" />
                          )}
                        </Link>
                      ) : (
                        <span className="text-zinc-600">{col.label}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playerData.map((player, index) => {
                  const rank = index + 1;

                  return (
                    <tr
                      key={player.steamId}
                      className={`border-b border-zinc-800/50 ${
                        rank <= 3 ? "bg-zinc-800/20" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 pr-4">
                        {rank === 1 ? (
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          </div>
                        ) : rank === 2 ? (
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-400/20">
                            <Medal className="h-4 w-4 text-zinc-400" />
                          </div>
                        ) : rank === 3 ? (
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/20">
                            <Award className="h-4 w-4 text-amber-700" />
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-zinc-500 pl-2">
                            {rank}
                          </span>
                        )}
                      </td>

                      {/* Player */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {player.avatar ? (
                            <Image
                              src={player.avatar}
                              alt={player.name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center">
                              <User className="h-4 w-4 text-zinc-400" />
                            </div>
                          )}
                          <span className="font-medium text-white truncate max-w-[160px]">
                            {player.name}
                          </span>
                        </div>
                      </td>

                      {/* Category Columns */}
                      {category.columns.map((col, colIndex) => {
                        let value: string;
                        if (col.compute) {
                          value = col.compute(player);
                        } else if (col.key === "hoursPlayed") {
                          value = (player[col.key as keyof PlayerData] as number).toFixed(1);
                        } else {
                          value = (player[col.key as keyof PlayerData] as number)?.toLocaleString?.() ?? "0";
                        }

                        const isActiveSort = sortField === col.key;

                        return (
                          <td
                            key={col.key}
                            className={`py-3 pr-4 text-right ${
                              colIndex === 0 || isActiveSort
                                ? "font-medium text-white"
                                : "text-zinc-400"
                            }`}
                          >
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
