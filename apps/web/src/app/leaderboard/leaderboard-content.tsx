"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Trophy,
  Medal,
  Award,
  User,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getKDRatio } from "@/lib/utils";
import type { RegionGroup } from "./page";

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

interface LeaderboardResponse {
  players: PlayerData[];
  wipeId: string | null;
  server: string;
  availableWipes: string[];
}

// ============================================
// COMPONENT
// ============================================

interface LeaderboardContentProps {
  regionGroups: RegionGroup[];
  initialServer?: string;
  initialCategory?: string;
  initialSort?: string;
  initialOrder?: string;
  initialWipe?: string;
}

export function LeaderboardContent({
  regionGroups,
  initialServer,
  initialCategory,
  initialSort,
  initialOrder,
  initialWipe,
}: LeaderboardContentProps) {
  const router = useRouter();

  // All server slugs for validation
  const allSlugs = regionGroups.flatMap((rg) => rg.servers.map((s) => s.slug));
  const defaultServer = allSlugs[0] ?? "us-main";

  // Resolve initial values
  const resolvedServer = initialServer && (allSlugs.includes(initialServer) || initialServer === "overall")
    ? initialServer
    : defaultServer;
  const resolvedCategory = CATEGORIES.find((c) => c.key === initialCategory) || CATEGORIES[0];

  // State
  const [server, setServer] = useState(resolvedServer);
  const [category, setCategory] = useState(resolvedCategory);
  const [sort, setSort] = useState(
    initialSort && category.columns.some((c) => c.key === initialSort && c.sortable)
      ? initialSort
      : resolvedCategory.defaultSort
  );
  const [order, setOrder] = useState<"asc" | "desc">(initialOrder === "asc" ? "asc" : "desc");
  const [wipe, setWipe] = useState<string | undefined>(initialWipe);

  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [availableWipes, setAvailableWipes] = useState<string[]>([]);
  const [currentWipeId, setCurrentWipeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [wipeDropdownOpen, setWipeDropdownOpen] = useState(false);
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const wipeDropdownRef = useRef<HTMLDivElement>(null);

  // Find current server name for display
  const currentServerName = server === "overall"
    ? "Overall (All-Time)"
    : regionGroups.flatMap((rg) => rg.servers).find((s) => s.slug === server)?.name ?? server;

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      server,
      sort,
      order,
    });
    if (wipe && server !== "overall") {
      params.set("wipe", wipe);
    }

    try {
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data: LeaderboardResponse = await res.json();
      setPlayers(data.players);
      setAvailableWipes(data.availableWipes);
      setCurrentWipeId(data.wipeId);
    } catch {
      setPlayers([]);
      setAvailableWipes([]);
      setCurrentWipeId(null);
    } finally {
      setLoading(false);
    }
  }, [server, sort, order, wipe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL (shallow)
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("server", server);
    params.set("category", category.key);
    params.set("sort", sort);
    params.set("order", order);
    if (wipe && server !== "overall") {
      params.set("wipe", wipe);
    }
    router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
  }, [server, category.key, sort, order, wipe, router]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setServerDropdownOpen(false);
      }
      if (wipeDropdownRef.current && !wipeDropdownRef.current.contains(event.target as Node)) {
        setWipeDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setServerDropdownOpen(false);
        setWipeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleServerSelect(slug: string) {
    setServer(slug);
    setWipe(undefined); // reset wipe when switching servers
    setServerDropdownOpen(false);
  }

  function handleWipeSelect(wipeId: string) {
    setWipe(wipeId);
    setWipeDropdownOpen(false);
  }

  function handleCategorySelect(cat: CategoryDef) {
    setCategory(cat);
    setSort(cat.defaultSort);
    setOrder("desc");
  }

  function handleSortClick(colKey: string) {
    if (colKey === sort) {
      setOrder(order === "desc" ? "asc" : "desc");
    } else {
      setSort(colKey);
      setOrder("desc");
    }
  }

  // Wipe display label
  const wipeDisplayLabel = currentWipeId
    ? availableWipes.length > 0 && currentWipeId === availableWipes[0]
      ? `${currentWipeId} (Latest)`
      : currentWipeId
    : "No wipes";

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-rust-500" />
            Leaderboard
          </h1>
          <p className="text-zinc-400">
            {server === "overall"
              ? "All-time stats across every server and wipe"
              : "Top players for the selected wipe"}
          </p>
        </div>

        {/* Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Server Dropdown */}
          <div className="relative" ref={serverDropdownRef}>
            <button
              onClick={() => {
                setServerDropdownOpen(!serverDropdownOpen);
                setWipeDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-sm font-medium hover:border-zinc-700 transition-colors min-w-[180px]"
            >
              {server === "overall" && (
                <Layers className="h-4 w-4 text-rust-500 shrink-0" />
              )}
              <span className="truncate">{currentServerName}</span>
              <ChevronDown className={`h-4 w-4 text-zinc-500 ml-auto shrink-0 transition-transform ${serverDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {serverDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
                {/* Overall option */}
                <button
                  onClick={() => handleServerSelect("overall")}
                  className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors ${
                    server === "overall"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white"
                  }`}
                >
                  <Layers className="h-4 w-4 text-rust-500 shrink-0" />
                  Overall (All-Time)
                </button>

                <div className="border-t border-zinc-800 my-1" />

                {/* Region groups */}
                {regionGroups.map((rg) => (
                  <div key={rg.region}>
                    <div className="px-4 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      {rg.region}
                    </div>
                    {rg.servers.map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => handleServerSelect(s.slug)}
                        className={`flex items-center w-full px-4 py-2 text-sm text-left transition-colors ${
                          server === s.slug
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wipe Dropdown (hidden for overall) */}
          {server !== "overall" && (
            <div className="relative" ref={wipeDropdownRef}>
              <button
                onClick={() => {
                  setWipeDropdownOpen(!wipeDropdownOpen);
                  setServerDropdownOpen(false);
                }}
                disabled={availableWipes.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-sm font-medium hover:border-zinc-700 transition-colors min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate">{wipeDisplayLabel}</span>
                <ChevronDown className={`h-4 w-4 text-zinc-500 ml-auto shrink-0 transition-transform ${wipeDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {wipeDropdownOpen && availableWipes.length > 0 && (
                <div className="absolute left-0 mt-1.5 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                  {availableWipes.map((w, i) => (
                    <button
                      key={w}
                      onClick={() => handleWipeSelect(w)}
                      className={`flex items-center w-full px-4 py-2 text-sm text-left transition-colors ${
                        currentWipeId === w
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white"
                      }`}
                    >
                      {w}
                      {i === 0 && (
                        <span className="ml-2 text-[10px] font-medium text-rust-400 bg-rust-500/10 px-1.5 py-0.5 rounded">
                          Latest
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategorySelect(cat)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                category.key === cat.key
                  ? "bg-zinc-700/80 text-white border border-zinc-600/50"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-sm text-zinc-500">
                  <th className="pb-3 pr-4 w-12">#</th>
                  <th className="pb-3 pr-4">Player</th>
                  {category.columns.map((col) => (
                    <th key={col.key} className="pb-3 pr-4 text-right">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4">
                      <div className="h-5 w-6 bg-zinc-800 rounded animate-pulse" />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
                        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                      </div>
                    </td>
                    {category.columns.map((col) => (
                      <td key={col.key} className="py-3 pr-4 text-right">
                        <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse ml-auto" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : players.length === 0 ? (
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
                        <button
                          onClick={() => handleSortClick(col.key)}
                          className="inline-flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {col.label}
                          {sort === col.key ? (
                            order === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5 text-rust-500" />
                            ) : (
                              <ChevronUp className="h-3.5 w-3.5 text-rust-500" />
                            )
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-30" />
                          )}
                        </button>
                      ) : (
                        <span className="text-zinc-600">{col.label}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => {
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

                        const isActiveSort = sort === col.key;

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
