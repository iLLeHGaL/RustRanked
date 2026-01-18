import Link from "next/link";
import Image from "next/image";
import { prisma } from "@rustranked/database";
import { getRankInfo } from "@/lib/elo";
import { Trophy, Medal, Award, User, ArrowLeft } from "lucide-react";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function LeaderboardPage() {
  const topPlayers = await prisma.user.findMany({
    where: {
      matchesPlayed: { gt: 0 },
    },
    orderBy: { elo: "desc" },
    take: 100,
    select: {
      id: true,
      discordName: true,
      discordAvatar: true,
      steamName: true,
      elo: true,
      kills: true,
      deaths: true,
      wins: true,
      losses: true,
      matchesPlayed: true,
    },
  });

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-dark-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rust-600">
              <span className="text-lg font-bold text-white">R</span>
            </div>
            <span className="text-xl font-bold text-white">RustRanked</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-rust-500" />
            Leaderboard
          </h1>
          <p className="text-zinc-400">
            Top 100 ranked players on RustRanked
          </p>
        </div>

        {topPlayers.length === 0 ? (
          <div className="card text-center py-12">
            <Trophy className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No ranked players yet.</p>
            <p className="text-sm text-zinc-500 mt-2">
              Be the first to play a ranked match!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topPlayers.map((player, index) => {
              const rank = index + 1;
              const rankInfo = getRankInfo(player.elo);
              const kd =
                player.deaths > 0
                  ? (player.kills / player.deaths).toFixed(2)
                  : player.kills.toString();
              const winRate =
                player.wins + player.losses > 0
                  ? Math.round(
                      (player.wins / (player.wins + player.losses)) * 100
                    )
                  : 0;

              return (
                <div
                  key={player.id}
                  className={`card flex items-center gap-4 py-4 ${
                    rank <= 3 ? "border-rust-600/30" : ""
                  }`}
                >
                  {/* Rank */}
                  <div className="w-12 flex-shrink-0 text-center">
                    {rank === 1 ? (
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      </div>
                    ) : rank === 2 ? (
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-400/20">
                        <Medal className="h-5 w-5 text-zinc-400" />
                      </div>
                    ) : rank === 3 ? (
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-700/20">
                        <Award className="h-5 w-5 text-amber-700" />
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-zinc-500">
                        #{rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {player.discordAvatar ? (
                      <Image
                        src={player.discordAvatar}
                        alt={player.discordName}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center">
                        <User className="h-5 w-5 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  {/* Name & Rank */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {player.steamName || player.discordName}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${rankInfo.color}20`,
                          color: rankInfo.color,
                        }}
                      >
                        {rankInfo.name}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {player.matchesPlayed} matches played
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-zinc-500">K/D</div>
                      <div className="font-medium text-white">{kd}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-zinc-500">Win Rate</div>
                      <div className="font-medium text-white">{winRate}%</div>
                    </div>
                  </div>

                  {/* ELO */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {player.elo}
                    </div>
                    <div className="text-xs text-zinc-500">ELO</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
