import Link from "next/link";
import Image from "next/image";
import { prisma, ServerType } from "@rustranked/database";
import { Trophy, Medal, Award, User } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getKDRatio } from "@/lib/utils";

export const revalidate = 60;

const SERVER_TABS = [
  { key: "US_MAIN", label: "US Main" },
  { key: "US_MONDAYS", label: "US Mondays" },
  { key: "EU_MAIN", label: "EU Main" },
  { key: "EU_MONDAYS", label: "EU Mondays" },
] as const;

type ServerTabKey = (typeof SERVER_TABS)[number]["key"];

function isValidServerType(value: string | null | undefined): value is ServerTabKey {
  return SERVER_TABS.some((tab) => tab.key === value);
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ server?: string }>;
}) {
  const params = await searchParams;
  const serverType: ServerTabKey = isValidServerType(params.server)
    ? params.server
    : "US_MAIN";

  // Find the latest wipeId for this server
  const latestWipe = await prisma.wipeStats.findFirst({
    where: { serverType: serverType as ServerType },
    orderBy: { updatedAt: "desc" },
    select: { wipeId: true },
  });

  const wipeId = latestWipe?.wipeId;

  // Get top 100 players for this server's current wipe
  const topPlayers = wipeId
    ? await prisma.wipeStats.findMany({
        where: {
          serverType: serverType as ServerType,
          wipeId,
        },
        orderBy: { kills: "desc" },
        take: 100,
      })
    : [];

  // Get user info for all players
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

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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

        {/* Server Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {SERVER_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/leaderboard?server=${tab.key}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                serverType === tab.key
                  ? "bg-rust-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {topPlayers.length === 0 ? (
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
                  <th className="pb-3 pr-4 text-right">Kills</th>
                  <th className="pb-3 pr-4 text-right">Deaths</th>
                  <th className="pb-3 pr-4 text-right">K/D</th>
                  <th className="pb-3 pr-4 text-right">Headshots</th>
                  <th className="pb-3 text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((stat, index) => {
                  const rank = index + 1;
                  const user = userMap.get(stat.steamId);
                  const displayName = user?.steamName || user?.discordName || stat.steamId;
                  const avatar = user?.discordAvatar;

                  return (
                    <tr
                      key={stat.id}
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
                          {avatar ? (
                            <Image
                              src={avatar}
                              alt={displayName}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center">
                              <User className="h-4 w-4 text-zinc-400" />
                            </div>
                          )}
                          <span className="font-medium text-white truncate">
                            {displayName}
                          </span>
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="py-3 pr-4 text-right font-medium text-white">
                        {stat.kills}
                      </td>
                      <td className="py-3 pr-4 text-right text-zinc-400">
                        {stat.deaths}
                      </td>
                      <td className="py-3 pr-4 text-right text-zinc-300">
                        {getKDRatio(stat.kills, stat.deaths)}
                      </td>
                      <td className="py-3 pr-4 text-right text-zinc-400">
                        {stat.headshots}
                      </td>
                      <td className="py-3 text-right text-zinc-400">
                        {stat.hoursPlayed.toFixed(1)}
                      </td>
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
