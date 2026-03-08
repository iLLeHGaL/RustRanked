"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, Copy, Check } from "lucide-react";

interface Server {
  id: string;
  name: string;
  slug: string;
  region: string;
  category: string;
  teamLimit: number | null;
  wipeSchedule: string;
  mapSize: number | null;
  maxPlayers: number;
  displayOrder: number;
  connectUrl: string | null;
  ip: string;
  port: number;
}

const REGIONS = ["US", "EU", "SEA"] as const;

const REGION_CONFIG: Record<
  string,
  { flag: string; accent: string; accentBg: string }
> = {
  US: {
    flag: "\u{1F1FA}\u{1F1F8}",
    accent: "border-l-red-500",
    accentBg: "bg-red-500",
  },
  EU: {
    flag: "\u{1F1EA}\u{1F1FA}",
    accent: "border-l-blue-500",
    accentBg: "bg-blue-500",
  },
  SEA: {
    flag: "\u{1F30F}",
    accent: "border-l-emerald-500",
    accentBg: "bg-emerald-500",
  },
};

export function ServersContent({ servers }: { servers: Server[] }) {
  const [activeRegion, setActiveRegion] = useState<string>("US");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const grouped = REGIONS.reduce(
    (acc, region) => {
      acc[region] = servers.filter((s) => s.region === region);
      return acc;
    },
    {} as Record<string, Server[]>
  );

  const handleCopy = async (server: Server) => {
    const cmd = `client.connect ${server.ip}:${server.port}`;
    await navigator.clipboard.writeText(cmd);
    setCopiedId(server.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Region Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {REGIONS.map((region) => {
          const config = REGION_CONFIG[region];
          return (
            <button
              key={region}
              onClick={() => setActiveRegion(region)}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeRegion === region
                  ? "bg-rust-600 text-white shadow-lg shadow-rust-600/20"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
              }`}
            >
              <span className="mr-1.5">{config.flag}</span>
              {region}
              <span className="ml-2 text-xs opacity-70">
                ({grouped[region]?.length || 0})
              </span>
            </button>
          );
        })}
      </div>

      {/* Server Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {grouped[activeRegion]?.map((server) => {
          const config = REGION_CONFIG[server.region];
          const connectCmd = `client.connect ${server.ip}:${server.port}`;
          const isCopied = copiedId === server.id;

          return (
            <div
              key={server.id}
              className={`relative rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm overflow-hidden border-l-[3px] ${config.accent} hover:border-zinc-700 transition-colors`}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-lg leading-tight">
                      {server.name}
                    </h3>
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">
                      {server.category}
                    </span>
                  </div>
                  {server.teamLimit && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium border border-amber-500/20">
                      Max {server.teamLimit}
                    </span>
                  )}
                </div>

                {/* Info Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs">
                    {server.wipeSchedule}
                  </span>
                  {server.mapSize && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs">
                      {server.mapSize} map
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs">
                    {server.maxPlayers} slots
                  </span>
                </div>

                {/* Connect Command */}
                <div className="mb-4">
                  <button
                    onClick={() => handleCopy(server)}
                    className="w-full group flex items-center justify-between gap-2 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 hover:border-zinc-600 transition-colors cursor-pointer"
                  >
                    <code className="text-xs text-zinc-400 font-mono truncate">
                      {connectCmd}
                    </code>
                    <span className="flex-shrink-0">
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      )}
                    </span>
                  </button>
                  {isCopied && (
                    <p className="text-xs text-green-400 mt-1.5 text-center">
                      Copied! Paste in F1 console
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(server)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium py-2.5 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {isCopied ? "Copied!" : "Connect"}
                  </button>
                  <Link
                    href={`/vip?server=${server.slug}`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rust-600/15 hover:bg-rust-600/25 text-rust-400 hover:text-rust-300 text-sm font-medium py-2.5 transition-colors border border-rust-600/20"
                  >
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    Get VIP
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {grouped[activeRegion]?.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No servers available for this region yet.
        </div>
      )}
    </div>
  );
}
