"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User as UserType,
  type Subscription,
  type VipAccess,
  VerificationStatus,
} from "@rustranked/database";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Gamepad2,
  Target,
  Skull,
  Timer,
  Pickaxe,
  ExternalLink,
  User,
  Trophy,
  Zap,
  Flame,
  Crown,
} from "lucide-react";
import { Navbar } from "@/components/navbar";

interface WipeStats {
  kills: number;
  deaths: number;
  hoursPlayed: number;
  resourcesGathered: number;
}

function getKDRatio(kills: number, deaths: number): string {
  if (deaths === 0) return kills > 0 ? kills.toFixed(1) : "0.0";
  return (kills / deaths).toFixed(2);
}

type UserWithSubscription = UserType & {
  subscription: Subscription | null;
  vipAccess: VipAccess[];
};

export function DashboardContent({ user }: { user: UserWithSubscription }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  const [wipeStats, setWipeStats] = useState<WipeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [battlePass, setBattlePass] = useState<{
    season: { name: string; number: number; endsAt: string } | null;
    progress: {
      currentXp: number;
      currentLevel: number;
      levelProgress: number;
      loginStreak: number;
      lastLoginDate: string | null;
      xpToNextLevel: number;
    } | null;
  } | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);

  const isVerified = user.verificationStatus === VerificationStatus.VERIFIED;
  const canPlay = isVerified && !!user.steamId;
  const hasVip = user.vipAccess.length > 0;
  const activeVip = user.vipAccess[0] ?? null;

  useEffect(() => {
    async function fetchWipeStats() {
      if (!user.steamId) {
        setStatsLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/stats/current");
        const data = await res.json();
        setWipeStats(data.stats);
      } catch (error) {
        console.error("Failed to fetch wipe stats:", error);
      } finally {
        setStatsLoading(false);
      }
    }

    async function fetchBattlePass() {
      try {
        const res = await fetch("/api/battle-pass/progress");
        const data = await res.json();
        setBattlePass(data);
      } catch (error) {
        console.error("Failed to fetch battle pass:", error);
      }
    }

    fetchWipeStats();
    fetchBattlePass();
  }, [user.steamId]);

  const handleClaimDaily = async () => {
    setClaimingDaily(true);
    try {
      const res = await fetch("/api/battle-pass/daily-login", { method: "POST" });
      if (res.ok) {
        const bpRes = await fetch("/api/battle-pass/progress");
        const bpData = await bpRes.json();
        setBattlePass(bpData);
      }
    } catch {
      console.error("Failed to claim daily login");
    } finally {
      setClaimingDaily(false);
    }
  };

  const canClaimDaily = battlePass?.progress &&
    (!battlePass.progress.lastLoginDate ||
      !isSameDayUTC(new Date(battlePass.progress.lastLoginDate), new Date()));

  function isSameDayUTC(a: Date, b: Date): boolean {
    return a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate();
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">
              {error === "steam_verification_failed" &&
                "Failed to verify Steam account. Please try again."}
              {error === "steam_already_linked" &&
                "This Steam account is already linked to another user."}
            </p>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-400">
              {success === "steam_linked" &&
                "Steam account linked successfully!"}
              {success === "vip_activated" &&
                "VIP activated! Enjoy queue priority."}
              {success === "subscribed" &&
                "VIP activated! Enjoy queue priority."}
              {success === "verified" &&
                "Identity verified successfully!"}
            </p>
          </div>
        )}

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
              {canPlay && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-dark-950">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {user.discordName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                {user.steamName && (
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="h-4 w-4" />
                    {user.steamName}
                  </span>
                )}
                {hasVip && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Crown className="h-4 w-4" />
                    VIP
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {!isVerified && (
                <Link href="/verify" className="btn-primary">
                  <Shield className="h-4 w-4 mr-2" />
                  Verify ID
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Steam Status */}
          <StatusCard
            title="Steam Account"
            icon={Gamepad2}
            status={user.steamId ? "complete" : "required"}
            statusText={user.steamId ? "Linked" : "Not Linked"}
            action={
              !user.steamId ? (
                <Link
                  href="/api/steam/link"
                  className="btn-secondary text-sm mt-4"
                >
                  Link Steam
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              ) : null
            }
          >
            {user.steamId ? (
              <p className="text-sm text-zinc-400 mt-2">
                Connected as {user.steamName}
              </p>
            ) : (
              <p className="text-sm text-zinc-400 mt-2">
                Link your Steam account to play on RustRanked servers
              </p>
            )}
          </StatusCard>

          {/* Verification Status */}
          <StatusCard
            title="ID Verification"
            icon={Shield}
            status={
              user.verificationStatus === VerificationStatus.VERIFIED
                ? "complete"
                : user.verificationStatus === VerificationStatus.PENDING
                  ? "pending"
                  : user.verificationStatus === VerificationStatus.REJECTED
                    ? "error"
                    : "required"
            }
            statusText={getVerificationStatusText(user.verificationStatus)}
            action={
              user.verificationStatus === VerificationStatus.UNVERIFIED ||
              user.verificationStatus === VerificationStatus.REJECTED ? (
                <Link href="/verify" className="btn-secondary text-sm mt-4">
                  {user.verificationStatus === VerificationStatus.REJECTED
                    ? "Retry Verification"
                    : "Start Verification"}
                </Link>
              ) : null
            }
          >
            <p className="text-sm text-zinc-400 mt-2">
              {user.verificationStatus === VerificationStatus.VERIFIED
                ? "Your identity has been verified"
                : user.verificationStatus === VerificationStatus.PENDING
                  ? "Verification in progress..."
                  : user.verificationStatus === VerificationStatus.REJECTED
                    ? "Verification failed. Please contact support."
                    : "Verify your ID to prevent cheaters"}
            </p>
          </StatusCard>

          {/* VIP Status */}
          <StatusCard
            title="VIP"
            icon={Crown}
            status={hasVip ? "complete" : "optional"}
            statusText={hasVip ? "Active" : "Optional"}
            action={
              hasVip ? (
                <Link href="/billing" className="btn-secondary text-sm mt-4">
                  Manage VIP
                </Link>
              ) : (
                <Link href="/vip" className="btn-secondary text-sm mt-4">
                  Get VIP
                </Link>
              )
            }
          >
            {hasVip && activeVip ? (
              <p className="text-sm text-zinc-400 mt-2">
                {activeVip.type === "MONTHLY" ? "Monthly" : "Wipe"} VIP &middot;{" "}
                {activeVip.type === "MONTHLY"
                  ? `Renews ${new Date(activeVip.expiresAt).toLocaleDateString()}`
                  : `Expires ${new Date(activeVip.expiresAt).toLocaleDateString()}`}
              </p>
            ) : (
              <p className="text-sm text-zinc-400 mt-2">
                Queue priority on all servers
              </p>
            )}
          </StatusCard>
        </div>

        {/* Wipe Stats Grid */}
        <h2 className="text-xl font-bold text-white mb-4">Current Wipe Stats</h2>
        {statsLoading ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-20 mb-2" />
                <div className="h-8 bg-zinc-800 rounded w-16 mb-1" />
                <div className="h-3 bg-zinc-800 rounded w-24" />
              </div>
            ))}
          </div>
        ) : !user.steamId ? (
          <div className="card mb-8 p-6 text-center">
            <p className="text-zinc-400">Link your Steam account to see your wipe stats</p>
          </div>
        ) : !wipeStats ? (
          <div className="card mb-8 p-6 text-center">
            <p className="text-zinc-400">No stats recorded for the current wipe yet</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
            <StatCard
              icon={Target}
              label="Kills"
              value={wipeStats.kills.toLocaleString()}
              subtext={`K/D: ${getKDRatio(wipeStats.kills, wipeStats.deaths)}`}
            />
            <StatCard
              icon={Skull}
              label="Deaths"
              value={wipeStats.deaths.toLocaleString()}
              subtext="This wipe"
            />
            <StatCard
              icon={Timer}
              label="Hours Played"
              value={wipeStats.hoursPlayed.toFixed(1)}
              subtext="This wipe"
            />
            <StatCard
              icon={Pickaxe}
              label="Resources"
              value={wipeStats.resourcesGathered.toLocaleString()}
              subtext="Gathered"
            />
          </div>
        )}

        {/* Battle Pass Summary */}
        {battlePass?.season && battlePass?.progress && (
          <>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-rust-500" />
              Battle Pass
              <span className="text-sm font-normal text-zinc-500 ml-2">
                {battlePass.season.name}
              </span>
            </h2>
            <div className="card mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Level Badge */}
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-rust-600 to-rust-800 flex items-center justify-center flex-shrink-0">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white leading-none">
                      {battlePass.progress.currentLevel}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-rust-200/80">Lv</div>
                  </div>
                </div>

                {/* XP Progress */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm text-zinc-400">
                      {battlePass.progress.currentXp.toLocaleString()} XP
                    </span>
                    <span className="text-xs text-zinc-500">
                      {battlePass.progress.xpToNextLevel.toLocaleString()} to next
                    </span>
                  </div>
                  <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rust-600 to-rust-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(battlePass.progress.levelProgress * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Daily Login + Streak */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {battlePass.progress.loginStreak > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 text-xs">
                      <Flame className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-zinc-300 font-medium">{battlePass.progress.loginStreak}d</span>
                    </div>
                  )}
                  <button
                    onClick={handleClaimDaily}
                    disabled={!canClaimDaily || claimingDaily}
                    className={canClaimDaily ? "btn-primary text-sm" : "btn-secondary text-sm opacity-50 cursor-not-allowed"}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    {claimingDaily ? "..." : canClaimDaily ? "+200 XP" : "Claimed"}
                  </button>
                  <Link href="/battle-pass" className="btn-secondary text-sm">
                    View
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Access Status */}
        {canPlay ? (
          <div className="card bg-green-500/5 border-green-500/20">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  You&apos;re ready to play!
                </h3>
                <p className="text-sm text-zinc-400">
                  Connect to any RustRanked server to start playing.
                </p>
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
                <h3 className="font-semibold text-white">
                  Complete setup to play
                </h3>
                <p className="text-sm text-zinc-400">
                  {!user.steamId && "Link your Steam account. "}
                  {!isVerified && "Verify your ID."}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
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
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
        >
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

function getVerificationStatusText(status: VerificationStatus): string {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return "Verified";
    case VerificationStatus.PENDING:
      return "Pending";
    case VerificationStatus.REJECTED:
      return "Rejected";
    default:
      return "Not Verified";
  }
}
