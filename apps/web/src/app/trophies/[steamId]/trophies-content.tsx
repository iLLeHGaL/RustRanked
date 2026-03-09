"use client";

import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { TrophyCard } from "@/components/trophy-card";

interface TrophyData {
  id: string;
  rank: number;
  category: string;
  statValue: number;
  serverName: string;
  wipeId: string;
}

const TIER_INFO = [
  {
    label: "Champion",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    description: "1st place in Most Kills for a wipe",
  },
  {
    label: "Gold",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    description: "1st place in any wipe category",
  },
  {
    label: "Silver",
    color: "text-zinc-300",
    bg: "bg-zinc-300/10",
    border: "border-zinc-300/30",
    description: "2nd place in any wipe category",
  },
  {
    label: "Bronze",
    color: "text-orange-600",
    bg: "bg-orange-600/10",
    border: "border-orange-600/30",
    description: "3rd place in any wipe category",
  },
];

const CATEGORIES = [
  { key: "MOST_KILLS", label: "Most Kills", description: "Player with the most PvP kills during a wipe" },
  { key: "MOST_RESOURCES", label: "Most Resources", description: "Player who gathered the most resources during a wipe" },
  { key: "MOST_GAMBLING_PROFIT", label: "Most Gambling Profit", description: "Player with the highest gambling profit during a wipe" },
];

export function TrophiesContent({
  steamId,
  playerName,
  trophies,
}: {
  steamId: string;
  playerName: string;
  trophies: TrophyData[];
}) {
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/profile/${steamId}`}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
          <h1 className="text-2xl font-bold text-white">{playerName}&apos;s Trophies</h1>
        </div>

        {/* Trophy Tiers Explanation */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Trophy Tiers</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TIER_INFO.map((tier) => (
              <div key={tier.label} className={`flex items-center gap-3 rounded-lg border ${tier.border} ${tier.bg} px-4 py-3`}>
                <Trophy className={`h-5 w-5 shrink-0 ${tier.color}`} />
                <div>
                  <span className={`text-sm font-bold ${tier.color}`}>{tier.label}</span>
                  <p className="text-xs text-zinc-400">{tier.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Explanation */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Categories</h2>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-start gap-3">
                <span className="text-sm font-medium text-rust-400 shrink-0 w-40">{cat.label}</span>
                <span className="text-sm text-zinc-400">{cat.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trophies Grid */}
        <h2 className="text-lg font-semibold text-white mb-4">
          Earned Trophies ({trophies.length})
        </h2>
        {trophies.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {trophies.map((trophy) => (
              <TrophyCard
                key={trophy.id}
                rank={trophy.rank}
                category={trophy.category}
                statValue={trophy.statValue}
                serverName={trophy.serverName}
                wipeId={trophy.wipeId}
              />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <Trophy className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No trophies earned yet.</p>
            <p className="text-sm text-zinc-500 mt-1">
              Finish in the top 3 of a wipe category to earn a trophy!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
