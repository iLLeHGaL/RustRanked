"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  Users,
  Shield,
  Gamepad2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  XCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { RankBadge } from "@/components/rank-badge";
import { TrophyCard } from "@/components/trophy-card";
import { getRankProgress } from "@/lib/ranks";
import { getKDRatio } from "@/lib/utils";

interface ProfileUser {
  id: string;
  steamId: string;
  steamName: string | null;
  steamAvatar: string | null;
  discordName: string;
  discordAvatar: string | null;
  verificationStatus: string;
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

interface FriendListItem {
  friendshipId: string;
  user: FriendUser;
}

export function ProfileContent({
  user,
  isOwner,
  stats,
  trophies,
  topFriends: initialTopFriends,
  friendshipStatus: initialFriendship,
  pendingCount,
  friendsList,
}: {
  user: ProfileUser;
  isOwner: boolean;
  stats: ProfileStats;
  trophies: TrophyData[];
  topFriends: TopFriendData[];
  friendshipStatus: FriendshipStatus | null;
  pendingCount: number;
  friendsList: FriendListItem[];
}) {
  const router = useRouter();
  const [friendship, setFriendship] = useState(initialFriendship);
  const [friendLoading, setFriendLoading] = useState(false);
  const [showTopFriendsModal, setShowTopFriendsModal] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<{ friendshipId: string; user: FriendUser; createdAt: string }[]>([]);
  const [topFriends, setTopFriends] = useState(initialTopFriends);
  const [selectedTopFriends, setSelectedTopFriends] = useState<string[]>(
    initialTopFriends.map((tf) => tf.user.id)
  );

  const isVerified = user.verificationStatus === "VERIFIED";
  const canPlay = isVerified && !!user.steamId;
  const hasVip = user.vipAccess.length > 0;

  const rankProgress = getRankProgress(stats.totalHours);

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

  async function loadPendingRequests() {
    const res = await fetch("/api/friends");
    const data = await res.json();
    setPendingRequests(data.pendingRequests ?? []);
    setShowFriendRequests(true);
  }

  async function handleAcceptRequest(friendshipId: string) {
    const res = await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "accept" }),
    });
    if (res.ok) {
      setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    }
  }

  async function handleDeclineRequest(friendshipId: string) {
    const res = await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "decline" }),
    });
    if (res.ok) {
      setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    }
  }

  function toggleTopFriend(friendId: string) {
    setSelectedTopFriends((prev) => {
      if (prev.includes(friendId)) return prev.filter((id) => id !== friendId);
      if (prev.length >= 5) return prev;
      return [...prev, friendId];
    });
  }

  async function saveTopFriends() {
    const friends = selectedTopFriends.map((friendId, i) => ({
      friendId,
      position: i + 1,
    }));

    const res = await fetch("/api/friends/top", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friends }),
    });

    if (res.ok) {
      setShowTopFriendsModal(false);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
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
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  {user.steamName ?? user.discordName}
                </h1>
                <RankBadge hours={stats.totalHours} size="sm" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                {user.steamName && (
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="h-4 w-4" />
                    {user.discordName}
                  </span>
                )}
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

        {/* Owner Controls */}
        {isOwner && (
          <div className="flex flex-wrap gap-3 mb-8">
            <button onClick={() => setShowTopFriendsModal(true)} className="btn-secondary text-sm">
              <Users className="h-4 w-4 mr-1.5" />
              Edit Top Friends
            </button>
            <button onClick={loadPendingRequests} className="btn-secondary text-sm relative">
              <UserPlus className="h-4 w-4 mr-1.5" />
              Friend Requests
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rust-500 text-white text-xs flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <Link href="/billing" className="btn-secondary text-sm">
              <CreditCard className="h-4 w-4 mr-1.5" />
              Account Settings
            </Link>
          </div>
        )}

        {/* Rank Card */}
        <div className="card mb-8">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <RankBadge hours={stats.totalHours} size="lg" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm text-zinc-400">
                  {stats.totalHours.toFixed(1)} hours played
                </span>
                {rankProgress.next && (
                  <span className="text-xs text-zinc-500">
                    {rankProgress.next.minHours - stats.totalHours > 0
                      ? `${(rankProgress.next.minHours - stats.totalHours).toFixed(1)}h to ${rankProgress.next.name}`
                      : rankProgress.next.name}
                  </span>
                )}
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${rankProgress.progress * 100}%`,
                    backgroundColor: rankProgress.current.color,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Cards (owner only) */}
        {isOwner && (
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <StatusCard
              title="Steam Account"
              icon={Gamepad2}
              status={user.steamId ? "complete" : "required"}
              statusText={user.steamId ? "Linked" : "Not Linked"}
              action={
                !user.steamId ? (
                  <Link href="/api/steam/link" className="btn-secondary text-sm mt-4">
                    Link Steam <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                ) : null
              }
            >
              <p className="text-sm text-zinc-400 mt-2">
                {user.steamId ? `Connected as ${user.steamName}` : "Link your Steam account to play"}
              </p>
            </StatusCard>

            <StatusCard
              title="ID Verification"
              icon={Shield}
              status={
                user.verificationStatus === "VERIFIED" ? "complete" :
                user.verificationStatus === "PENDING" ? "pending" :
                user.verificationStatus === "REJECTED" ? "error" : "required"
              }
              statusText={
                user.verificationStatus === "VERIFIED" ? "Verified" :
                user.verificationStatus === "PENDING" ? "Pending" :
                user.verificationStatus === "REJECTED" ? "Rejected" : "Not Verified"
              }
              action={
                (user.verificationStatus === "UNVERIFIED" || user.verificationStatus === "REJECTED") ? (
                  <Link href="/verify" className="btn-secondary text-sm mt-4">
                    {user.verificationStatus === "REJECTED" ? "Retry Verification" : "Start Verification"}
                  </Link>
                ) : null
              }
            >
              <p className="text-sm text-zinc-400 mt-2">
                {user.verificationStatus === "VERIFIED" ? "Your identity has been verified" :
                 user.verificationStatus === "PENDING" ? "Verification in progress..." :
                 user.verificationStatus === "REJECTED" ? "Verification failed. Please contact support." :
                 "Verify your ID to prevent cheaters"}
              </p>
            </StatusCard>

            <StatusCard
              title="VIP"
              icon={Crown}
              status={hasVip ? "complete" : "optional"}
              statusText={hasVip ? `${user.vipAccess.length} Active` : "Optional"}
              action={
                <div className="flex gap-2 mt-4">
                  {hasVip && <Link href="/billing" className="btn-secondary text-sm">Manage</Link>}
                  <Link href="/servers" className="btn-secondary text-sm">{hasVip ? "Add Server" : "Get VIP"}</Link>
                </div>
              }
            >
              {hasVip ? (
                <div className="mt-2 space-y-1">
                  {user.vipAccess.map((vip) => (
                    <p key={vip.id} className="text-sm text-zinc-400">
                      {vip.serverName} &middot; {vip.type === "MONTHLY" ? "Monthly" : "Wipe"} &middot;{" "}
                      {vip.type === "MONTHLY"
                        ? `Renews ${new Date(vip.expiresAt).toLocaleDateString()}`
                        : `Expires ${new Date(vip.expiresAt).toLocaleDateString()}`}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400 mt-2">Queue priority per server</p>
              )}
            </StatusCard>
          </div>
        )}

        {/* Stats Summary */}
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

        {/* Trophies */}
        <h2 className="text-xl font-bold text-white mb-4">Trophies</h2>
        {trophies.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
          <div className="card mb-8 p-6 text-center">
            <p className="text-zinc-400">No trophies earned yet. Finish in the top 3 of a wipe category to earn a trophy!</p>
          </div>
        )}

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
              {isOwner ? "No top friends set. Click \"Edit Top Friends\" to add some!" : "No top friends set."}
            </p>
          </div>
        )}

        {/* Access Status (owner only) */}
        {isOwner && (
          canPlay ? (
            <div className="card bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">You&apos;re ready to play!</h3>
                  <p className="text-sm text-zinc-400">Connect to any RustRanked server to start playing.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-yellow-500/5 border-yellow-500/20">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Complete setup to play</h3>
                  <p className="text-sm text-zinc-400">
                    {!user.steamId && "Link your Steam account. "}
                    {!isVerified && "Verify your ID."}
                  </p>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Friend Requests Modal */}
      {showFriendRequests && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFriendRequests(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Friend Requests</h3>
              <button onClick={() => setShowFriendRequests(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {pendingRequests.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">No pending requests</p>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.friendshipId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {req.user.discordAvatar ? (
                        <Image src={req.user.discordAvatar} alt="" width={32} height={32} className="rounded-full flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-zinc-400" />
                        </div>
                      )}
                      <p className="text-sm text-white truncate">{req.user.steamName ?? req.user.discordName}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleAcceptRequest(req.friendshipId)} className="btn-primary text-xs px-2 py-1">Accept</button>
                      <button onClick={() => handleDeclineRequest(req.friendshipId)} className="btn-secondary text-xs px-2 py-1">Decline</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Top Friends Modal */}
      {showTopFriendsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTopFriendsModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Edit Top Friends</h3>
              <button onClick={() => setShowTopFriendsModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-zinc-400 mb-4">Select up to 5 friends to feature on your profile. Order determines position.</p>
              {friendsList.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">No friends yet. Add some friends first!</p>
              ) : (
                <div className="space-y-2">
                  {friendsList.map((f) => {
                    const isSelected = selectedTopFriends.includes(f.user.id);
                    const position = selectedTopFriends.indexOf(f.user.id) + 1;
                    return (
                      <button
                        key={f.user.id}
                        onClick={() => toggleTopFriend(f.user.id)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
                          isSelected ? "bg-rust-500/10 border border-rust-500/30" : "hover:bg-zinc-800 border border-transparent"
                        }`}
                      >
                        {isSelected && (
                          <span className="h-6 w-6 rounded-full bg-rust-500 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                            {position}
                          </span>
                        )}
                        {f.user.discordAvatar ? (
                          <Image src={f.user.discordAvatar} alt="" width={32} height={32} className="rounded-full" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-zinc-400" />
                          </div>
                        )}
                        <p className="text-sm text-white truncate">{f.user.steamName ?? f.user.discordName}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
                <button onClick={() => setShowTopFriendsModal(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={saveTopFriends} className="btn-primary text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  title,
  icon: Icon,
  status,
  statusText,
  children,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "complete" | "pending" | "required" | "error" | "optional";
  statusText: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const statusColors = {
    complete: "text-green-400 bg-green-500/10",
    pending: "text-yellow-400 bg-yellow-500/10",
    required: "text-zinc-400 bg-zinc-500/10",
    error: "text-red-400 bg-red-500/10",
    optional: "text-zinc-400 bg-zinc-500/10",
  };

  const StatusIcon = {
    complete: CheckCircle,
    pending: Clock,
    required: AlertCircle,
    error: XCircle,
    optional: CreditCard,
  }[status];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-zinc-400" />
          <h3 className="font-medium text-white">{title}</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusText}
        </div>
      </div>
      {children}
      {action}
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
