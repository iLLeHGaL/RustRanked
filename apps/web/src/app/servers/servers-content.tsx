"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Map, Calendar, Crown, Shield } from "lucide-react";

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
}

const REGIONS = ["US", "EU", "SEA"] as const;

export function ServersContent({ servers }: { servers: Server[] }) {
  const [activeRegion, setActiveRegion] = useState<string>("US");

  const grouped = REGIONS.reduce(
    (acc, region) => {
      acc[region] = servers.filter((s) => s.region === region);
      return acc;
    },
    {} as Record<string, Server[]>
  );

  return (
    <div>
      {/* Region Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {REGIONS.map((region) => (
          <button
            key={region}
            onClick={() => setActiveRegion(region)}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeRegion === region
                ? "bg-rust-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            {region}
            <span className="ml-2 text-xs opacity-70">
              ({grouped[region]?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Server Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grouped[activeRegion]?.map((server) => (
          <div
            key={server.id}
            className="card hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white text-lg">
                  {server.name}
                </h3>
                <span className="text-xs text-zinc-500">{server.category}</span>
              </div>
              {server.teamLimit && (
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-300">
                  <Shield className="h-3 w-3" />
                  Max {server.teamLimit}
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Calendar className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                <span>{server.wipeSchedule}</span>
              </div>
              {server.mapSize && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Map className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  <span>{server.mapSize} map size</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Users className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                <span>{server.maxPlayers} max players</span>
              </div>
            </div>

            <Link
              href={`/vip?server=${server.slug}`}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
            >
              <Crown className="h-4 w-4 text-amber-400" />
              Get VIP
            </Link>
          </div>
        ))}
      </div>

      {grouped[activeRegion]?.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No servers available for this region yet.
        </div>
      )}
    </div>
  );
}
