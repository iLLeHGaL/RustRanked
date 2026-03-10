"use client";

import Link from "next/link";
import Image from "next/image";
import { Trophy, User, Crown } from "lucide-react";

interface ServerChampion {
  serverName: string;
  region: string;
  champion: {
    steamId: string;
    steamName: string | null;
    discordName: string;
    discordAvatar: string | null;
    kills: number;
    wipeId: string;
  } | null;
}

interface DecoratedPlayer {
  rank: number;
  steamId: string;
  steamName: string | null;
  discordName: string;
  discordAvatar: string | null;
  totalTrophies: number;
  champion: number;
  gold: number;
  silver: number;
  bronze: number;
}

export function HallOfFameContent({
  serverChampions,
  decoratedPlayers,
}: {
  serverChampions: ServerChampion[];
  decoratedPlayers: DecoratedPlayer[];
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white">Hall of Fame</h1>
        <p className="mt-2 text-zinc-400">
          The best players across all RustRanked servers
        </p>
      </div>

      {/* Server Champions */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Crown className="h-5 w-5 text-purple-400" />
          Server Champions
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Current #1 kill leader for each server
        </p>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {serverChampions.map((sc) => (
            <div key={sc.serverName} className="card border border-purple-400/20 bg-purple-400/5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-zinc-500 uppercase">{sc.region}</span>
                <span className="text-sm font-semibold text-white">{sc.serverName}</span>
              </div>
              {sc.champion ? (
                <Link
                  href={`/profile/${sc.champion.steamId}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {sc.champion.discordAvatar ? (
                    <Image
                      src={sc.champion.discordAvatar}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center">
                      <User className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {sc.champion.steamName ?? sc.champion.discordName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {sc.champion.kills.toLocaleString()} kills &middot; {sc.champion.wipeId}
                    </p>
                  </div>
                  <Trophy className="h-5 w-5 text-purple-400 shrink-0" />
                </Link>
              ) : (
                <p className="text-sm text-zinc-600 italic">No champion yet</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Most Decorated Players */}
      <section>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Most Decorated Players
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Players with the most trophies earned across all servers and wipes
        </p>
        {decoratedPlayers.length > 0 ? (
          <div className="space-y-2">
            {decoratedPlayers.map((player) => (
              <Link
                key={player.steamId}
                href={`/profile/${player.steamId}`}
                className="card flex items-center gap-4 hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-lg font-bold text-zinc-500 w-8 text-center shrink-0">
                  {player.rank}
                </span>
                {player.discordAvatar ? (
                  <Image
                    src={player.discordAvatar}
                    alt=""
                    width={40}
                    height={40}
                    className="rounded-full shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {player.steamName ?? player.discordName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {player.totalTrophies} {player.totalTrophies === 1 ? "trophy" : "trophies"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {player.champion > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <Trophy className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-purple-400 font-semibold">{player.champion}</span>
                    </span>
                  )}
                  {player.gold > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">{player.gold}</span>
                    </span>
                  )}
                  {player.silver > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <Trophy className="h-3.5 w-3.5 text-zinc-300" />
                      <span className="text-zinc-300 font-semibold">{player.silver}</span>
                    </span>
                  )}
                  {player.bronze > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <Trophy className="h-3.5 w-3.5 text-orange-600" />
                      <span className="text-orange-600 font-semibold">{player.bronze}</span>
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <Trophy className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No trophies have been awarded yet.</p>
            <p className="text-sm text-zinc-500 mt-1">
              Trophies are earned by finishing in the top 3 of a wipe category.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
