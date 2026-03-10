"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Crown,
  Eye,
  Target,
  Skull,
  Crosshair,
  Timer,
  Pickaxe,
  TreePine,
  Mountain,
  Gem,
  UserPlus,
  UserCheck,
  Clock,
  AlertCircle,
  EyeOff,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { RankBadge } from "@/components/rank-badge";
import { getKDRatio } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface ProfileUser {
  id: string;
  steamId: string;
  steamName: string | null;
  steamAvatar: string | null;
  discordName: string;
  discordAvatar: string | null;
  profileViews: number;
  createdAt: string;
  vipAccess: { id: string; type: string; expiresAt: string; serverName: string }[];
}

interface ProfileStats {
  totalHours: number;
  kills: number;
  deaths: number;
  headshots: number;
  resourcesGathered: number;
  woodGathered: number;
  stoneGathered: number;
  metalOreGathered: number;
  sulfurOreGathered: number;
}

interface TrophyData {
  id: string;
  rank: number;
  category: string;
  statValue: number;
  serverName: string;
  wipeId: string;
}

interface FriendUser {
  id: string;
  steamId: string | null;
  steamName: string | null;
  discordName: string;
  discordAvatar: string | null;
}

interface TopFriendData {
  position: number;
  user: FriendUser;
}

interface FriendshipStatus {
  friendshipId: string;
  status: string;
  direction: string;
}

export function ProfileContent({
  user,
  isOwner,
  hideStats,
  canPlay,
  stats,
  trophies,
  topFriends,
  friendshipStatus: initialFriendship,
}: {
  user: ProfileUser;
  isOwner: boolean;
  hideStats: boolean;
  canPlay: boolean;
  stats: ProfileStats;
  trophies: TrophyData[];
  topFriends: TopFriendData[];
  friendshipStatus: FriendshipStatus | null;
}) {
  const [friendship, setFriendship] = useState(initialFriendship);
  const [friendLoading, setFriendLoading] = useState(false);

  const hasVip = user.vipAccess.length > 0;
  const showStats = isOwner || !hideStats;

  // Trophy counts
  const championCount = trophies.filter((t) => t.rank === 1 && t.category === "MOST_KILLS").length;
  const goldCount = trophies.filter((t) => t.rank === 1).length;
  const silverCount = trophies.filter((t) => t.rank === 2).length;
  const bronzeCount = trophies.filter((t) => t.rank === 3).length;

  async function handleAddFriend() {
    setFriendLoading(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamId: user.steamId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFriendship({ friendshipId: data.friendship.id, status: "PENDING", direction: "sent" });
      }
    } finally {
      setFriendLoading(false);
    }
  }

  async function handleRespondFriend(action: "accept" | "decline") {
    if (!friendship) return;
    setFriendLoading(true);
    try {
      const res = await fetch("/api/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId: friendship.friendshipId, action }),
      });
      if (res.ok) {
        setFriendship({ ...friendship, status: action === "accept" ? "ACCEPTED" : "DECLINED" });
      }
    } finally {
      setFriendLoading(false);
    }
  }

  async function handleRemoveFriend() {
    if (!friendship) return;
    setFriendLoading(true);
    try {
      const res = await fetch("/api/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId: friendship.friendshipId }),
      });
      if (res.ok) {
        setFriendship(null);
      }
    } finally {
      setFriendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <a href={`https://steamcommunity.com/profiles/${user.steamId}`} target="_blank" rel="noopener noreferrer" className="relative block">
              {user.discordAvatar ? (
                <Image
                  src={user.discordAvatar}
                  alt={user.discordName}
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-zinc-700 flex items-center justify-center">
                  <User className="h-8 w-8 text-zinc-400" />
                </div>
              )}
              {hasVip && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center border-2 border-dark-950">
                  <Crown className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </a>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <a href={`https://steamcommunity.com/profiles/${user.steamId}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  <h1 className="text-2xl font-bold text-white">
                    {user.steamName ?? user.discordName}
                  </h1>
                </a>
                <RankBadge hours={stats.totalHours} size="sm" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {user.profileViews.toLocaleString()} views
                </span>
                {hasVip && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Crown className="h-4 w-4" />
                    VIP
                  </span>
                )}
              </div>
              {/* Trophy Counts */}
              <Link href={`/trophies/${user.steamId}`} className="mt-2 flex items-center gap-3 hover:opacity-80 transition-opacity">
                <TrophyBadge label="Champion" count={championCount} color="text-purple-400" bg="bg-purple-400/10" />
                <TrophyBadge label="Gold" count={goldCount} color="text-yellow-400" bg="bg-yellow-400/10" />
                <TrophyBadge label="Silver" count={silverCount} color="text-zinc-300" bg="bg-zinc-300/10" />
                <TrophyBadge label="Bronze" count={bronzeCount} color="text-orange-600" bg="bg-orange-600/10" />
              </Link>
            </div>

            {/* Friend action buttons (non-owner) */}
            {!isOwner && (
              <div className="flex gap-2">
                {!friendship && (
                  <button onClick={handleAddFriend} disabled={friendLoading} className="btn-primary text-sm">
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Add Friend
                  </button>
                )}
                {friendship?.status === "PENDING" && friendship.direction === "sent" && (
                  <button disabled className="btn-secondary text-sm opacity-60 cursor-default">
                    <Clock className="h-4 w-4 mr-1.5" />
                    Pending
                  </button>
                )}
                {friendship?.status === "PENDING" && friendship.direction === "received" && (
                  <>
                    <button onClick={() => handleRespondFriend("accept")} disabled={friendLoading} className="btn-primary text-sm">
                      Accept
                    </button>
                    <button onClick={() => handleRespondFriend("decline")} disabled={friendLoading} className="btn-secondary text-sm">
                      Decline
                    </button>
                  </>
                )}
                {friendship?.status === "ACCEPTED" && (
                  <button onClick={handleRemoveFriend} disabled={friendLoading} className="btn-secondary text-sm">
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Friends
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top Friends */}
        <h2 className="text-xl font-bold text-white mb-4">Top Friends</h2>
        {topFriends.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-8">
            {topFriends.map((tf) => (
              <Link
                key={tf.position}
                href={tf.user.steamId ? `/profile/${tf.user.steamId}` : "#"}
                className="card flex flex-col items-center gap-2 hover:bg-zinc-800/50 transition-colors p-4"
              >
                {tf.user.discordAvatar ? (
                  <Image src={tf.user.discordAvatar} alt="" width={48} height={48} className="rounded-full" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-zinc-700 flex items-center justify-center">
                    <User className="h-6 w-6 text-zinc-400" />
                  </div>
                )}
                <p className="text-sm font-medium text-white text-center truncate w-full">
                  {tf.user.steamName ?? tf.user.discordName}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card mb-8 p-6 text-center">
            <p className="text-zinc-400">
              {isOwner ? "No top friends set. Go to Settings to add some!" : "No top friends set."}
            </p>
          </div>
        )}

        {/* Stats Summary */}
        {showStats ? (
          <>
            <h2 className="text-xl font-bold text-white mb-4">All-Time Stats</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
              <StatCard icon={Target} label="Kills" value={stats.kills.toLocaleString()} subtext={`K/D: ${getKDRatio(stats.kills, stats.deaths)}`} />
              <StatCard icon={Skull} label="Deaths" value={stats.deaths.toLocaleString()} subtext="All-time" />
              <StatCard icon={Crosshair} label="Headshots" value={stats.headshots.toLocaleString()} subtext={stats.kills > 0 ? `${((stats.headshots / stats.kills) * 100).toFixed(1)}% HS rate` : "0% HS rate"} />
              <StatCard icon={Timer} label="Hours Played" value={stats.totalHours.toFixed(1)} subtext="All-time" />
              <StatCard icon={TreePine} label="Wood" value={stats.woodGathered.toLocaleString()} subtext="Gathered" />
              <StatCard icon={Mountain} label="Stone" value={stats.stoneGathered.toLocaleString()} subtext="Gathered" />
              <StatCard icon={Pickaxe} label="Metal Ore" value={stats.metalOreGathered.toLocaleString()} subtext="Gathered" />
              <StatCard icon={Gem} label="Sulfur Ore" value={stats.sulfurOreGathered.toLocaleString()} subtext="Gathered" />
            </div>
          </>
        ) : (
          <div className="card mb-8 p-8 text-center">
            <EyeOff className="h-8 w-8 text-zinc-500 mx-auto mb-3" />
            <p className="text-zinc-400">This player has hidden their stats.</p>
          </div>
        )}

        {/* Access Status - only show when setup is incomplete */}
        {isOwner && !canPlay && (
          <div className="card bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Complete setup to play</h3>
                <p className="text-sm text-zinc-400">
                  {!user.steamId && "Link your Steam account. "}
                  Visit <Link href="/verify" className="text-rust-400 hover:text-rust-300 underline">Verify</Link> to complete your setup.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TrophyBadge({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bg}`}>
      <Trophy className={`h-3.5 w-3.5 ${color}`} />
      <span className={`text-xs font-semibold ${color}`}>{count}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-rust-500" />
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
    </div>
  );
}
