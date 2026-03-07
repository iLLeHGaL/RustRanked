"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import {
  Gift,
  Lock,
  Star,
  Trophy,
  Flame,
  ChevronRight,
  ChevronLeft,
  Check,
  Crown,
  Calendar,
  Zap,
} from "lucide-react";

interface SeasonTier {
  id: string;
  level: number;
  isPremium: boolean;
  rewardType: string;
  rewardAmount: number | null;
  cosmeticId: string | null;
  caseDefId: string | null;
}

interface SeasonData {
  id: string;
  name: string;
  number: number;
  status: string;
  startsAt: string;
  endsAt: string;
  maxLevel: number;
  xpPerLevel: unknown;
  tiers: SeasonTier[];
}

interface ProgressData {
  currentXp: number;
  currentLevel: number;
  hasPremium: boolean;
  claimedLevels: number[];
  loginStreak: number;
  lastLoginDate: string | null;
  xpToNextLevel: number;
  xpRequiredForLevel: number;
  levelProgress: number;
}

const rewardIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  TOKENS: Star,
  XP: Zap,
  BATTLE_PASS_XP: Zap,
  COSMETIC: Crown,
  CASE: Gift,
  VIP_DAYS: Trophy,
  XP_BOOST: Flame,
  BADGE: Star,
};

function getRewardLabel(type: string, amount: number | null): string {
  switch (type) {
    case "TOKENS": return `${amount ?? 0} Tokens`;
    case "XP": return `${amount ?? 0} XP`;
    case "BATTLE_PASS_XP": return `${amount ?? 0} BP XP`;
    case "COSMETIC": return "Cosmetic";
    case "CASE": return "Case";
    case "VIP_DAYS": return `${amount ?? 0}d VIP`;
    case "XP_BOOST": return "XP Boost";
    case "BADGE": return "Badge";
    default: return "Reward";
  }
}

function getDaysRemaining(endsAt: string): number {
  const now = new Date();
  const end = new Date(endsAt);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function BattlePassContent() {
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [seasonRes, progressRes] = await Promise.all([
        fetch("/api/season/current"),
        fetch("/api/battle-pass/progress"),
      ]);
      const seasonData = await seasonRes.json();
      const progressData = await progressRes.json();
      setSeason(seasonData.season);
      setProgress(progressData.progress);
    } catch (error) {
      console.error("Failed to fetch battle pass data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaimTier = async (level: number) => {
    setClaiming(level);
    try {
      const res = await fetch("/api/battle-pass/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to claim tier:", error);
    } finally {
      setClaiming(null);
    }
  };

  const handleDailyLogin = async () => {
    setClaimingDaily(true);
    setDailyMessage(null);
    try {
      const res = await fetch("/api/battle-pass/daily-login", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setDailyMessage(
          `+${data.xpAwarded} XP${data.streakBonus > 0 ? ` (includes ${data.streakBonus} streak bonus!)` : ""}`
        );
        await fetchData();
      } else {
        setDailyMessage(data.error || "Failed to claim");
      }
    } catch {
      setDailyMessage("Failed to claim daily login");
    } finally {
      setClaimingDaily(false);
    }
  };

  const scrollTrack = (direction: "left" | "right") => {
    if (!trackRef.current) return;
    const scrollAmount = 400;
    trackRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const canClaimDaily =
    progress &&
    (!progress.lastLoginDate ||
      !isSameDay(new Date(progress.lastLoginDate), new Date()));

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="h-32 bg-zinc-900/50 rounded-xl animate-pulse" />
            <div className="h-24 bg-zinc-900/50 rounded-xl animate-pulse" />
            <div className="h-48 bg-zinc-900/50 rounded-xl animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="card text-center py-16">
            <Trophy className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Active Season</h2>
            <p className="text-zinc-400">
              Check back soon for the next season launch.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(season.endsAt);
  const tiers = season.tiers;

  // Group tiers by level for display (a level can have free + premium)
  const tiersByLevel: Record<number, SeasonTier[]> = {};
  for (const tier of tiers) {
    if (!tiersByLevel[tier.level]) tiersByLevel[tier.level] = [];
    tiersByLevel[tier.level].push(tier);
  }

  // Generate all level slots (1 to maxLevel)
  const levels = Array.from({ length: season.maxLevel }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Season Header */}
        <div className="card mb-6 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)",
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-widest text-rust-500">
                  Season {season.number}
                </span>
                <span className="h-1 w-1 rounded-full bg-zinc-600" />
                <span className="text-xs text-zinc-500 uppercase tracking-wide">
                  {season.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {season.name}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/80">
                <Calendar className="h-4 w-4 text-zinc-400" />
                <span className="text-zinc-300 font-medium">
                  {daysRemaining}
                </span>
                <span className="text-zinc-500">days left</span>
              </div>
            </div>
          </div>
        </div>

        {/* Player Progress + Daily Login Row */}
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {/* Level & XP Card */}
          <div className="card md:col-span-2">
            <div className="flex items-center gap-6">
              {/* Level Badge */}
              <div className="relative flex-shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-rust-600 to-rust-800 flex items-center justify-center shadow-lg shadow-rust-900/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white leading-none">
                      {progress?.currentLevel ?? 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-rust-200/80 mt-0.5">
                      Level
                    </div>
                  </div>
                </div>
                {progress?.hasPremium && (
                  <div className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center border-2 border-dark-950">
                    <Crown className="h-3 w-3 text-amber-900" />
                  </div>
                )}
              </div>

              {/* XP Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm text-zinc-400">
                    Level {progress?.currentLevel ?? 0} → {Math.min((progress?.currentLevel ?? 0) + 1, season.maxLevel)}
                  </span>
                  <span className="text-sm font-mono text-zinc-500">
                    {progress?.currentXp?.toLocaleString() ?? 0} XP
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-rust-600 to-rust-500 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min((progress?.levelProgress ?? 0) * 100, 100)}%`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-rust-400/20 to-transparent rounded-full animate-pulse"
                    style={{
                      width: `${Math.min((progress?.levelProgress ?? 0) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-zinc-500">
                    {progress?.xpToNextLevel?.toLocaleString() ?? 0} XP to next level
                  </span>
                  <span className="text-xs text-zinc-500">
                    {progress?.xpRequiredForLevel?.toLocaleString() ?? 0} XP required
                  </span>
                </div>
              </div>
            </div>

            {/* Premium Badge */}
            {progress && !progress.hasPremium && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-zinc-400">
                  <span className="text-amber-400 font-medium">Premium</span>{" "}
                  rewards unlock with an active subscription.
                </p>
              </div>
            )}
          </div>

          {/* Daily Login Card */}
          <div className="card flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-5 w-5 text-rust-500" />
              <h3 className="font-medium text-white">Daily Login</h3>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-xs">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="text-zinc-300 font-medium">
                  {progress?.loginStreak ?? 0}
                </span>
                <span className="text-zinc-500">day streak</span>
              </div>
              {progress && progress.loginStreak > 0 && progress.loginStreak % 7 === 0 && (
                <span className="text-xs text-amber-400">7-day bonus!</span>
              )}
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Claim 200 XP daily. Reach a 7-day streak for 500 bonus XP.
            </p>

            <div className="mt-auto">
              {dailyMessage && (
                <p className={`text-xs mb-2 ${dailyMessage.startsWith("+") ? "text-green-400" : "text-zinc-400"}`}>
                  {dailyMessage}
                </p>
              )}
              <button
                onClick={handleDailyLogin}
                disabled={!canClaimDaily || claimingDaily}
                className={`w-full ${canClaimDaily ? "btn-primary" : "btn-secondary opacity-50 cursor-not-allowed"}`}
              >
                {claimingDaily ? (
                  "Claiming..."
                ) : canClaimDaily ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Claim +200 XP
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Claimed Today
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Battle Pass Tier Track */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-rust-500" />
              Rewards Track
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollTrack("left")}
                className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-zinc-400" />
              </button>
              <button
                onClick={() => scrollTrack("right")}
                className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Scrollable Track */}
          <div
            ref={trackRef}
            className="overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin"
            style={{ scrollbarColor: "#3f3f46 transparent" }}
          >
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {levels.map((level) => {
                const levelTiers = tiersByLevel[level] || [];
                const freeTier = levelTiers.find((t) => !t.isPremium);
                const premiumTier = levelTiers.find((t) => t.isPremium);
                const isReached = (progress?.currentLevel ?? 0) >= level;
                const isCurrent = (progress?.currentLevel ?? 0) === level;
                const isClaimed = progress?.claimedLevels.includes(level) ?? false;
                const hasReward = levelTiers.length > 0;
                const canClaim = isReached && hasReward && !isClaimed;

                return (
                  <div
                    key={level}
                    className={`flex flex-col gap-2 w-[88px] flex-shrink-0 ${
                      isCurrent ? "relative" : ""
                    }`}
                  >
                    {/* Current Level Indicator */}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <div className="px-2 py-0.5 rounded bg-rust-600 text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                          You
                        </div>
                      </div>
                    )}

                    {/* Premium Tier Slot */}
                    <TierSlot
                      tier={premiumTier}
                      level={level}
                      isPremium
                      isReached={isReached}
                      isClaimed={isClaimed}
                      hasPremiumPass={progress?.hasPremium ?? false}
                      claiming={claiming === level}
                      onClaim={() => handleClaimTier(level)}
                      isCurrent={isCurrent}
                    />

                    {/* Level Number */}
                    <div
                      className={`text-center text-xs font-mono font-bold py-1 rounded ${
                        isCurrent
                          ? "bg-rust-600/20 text-rust-400 ring-1 ring-rust-600/40"
                          : isReached
                            ? "text-zinc-300"
                            : "text-zinc-600"
                      }`}
                    >
                      {level}
                    </div>

                    {/* Free Tier Slot */}
                    <TierSlot
                      tier={freeTier}
                      level={level}
                      isPremium={false}
                      isReached={isReached}
                      isClaimed={isClaimed}
                      hasPremiumPass={true}
                      claiming={claiming === level}
                      onClaim={canClaim ? () => handleClaimTier(level) : undefined}
                      isCurrent={isCurrent}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track Legend */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="h-3 w-3 rounded bg-zinc-800 border border-zinc-700" />
              <span>Free</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="h-3 w-3 rounded bg-amber-500/10 border border-amber-500/30" />
              <span>Premium</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="h-3 w-3 rounded bg-green-500/20 border border-green-500/40" />
              <span>Claimed</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="h-3 w-3 rounded bg-rust-600/20 border border-rust-600/40" />
              <span>Available</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TierSlot({
  tier,
  level,
  isPremium,
  isReached,
  isClaimed,
  hasPremiumPass,
  claiming,
  onClaim,
  isCurrent,
}: {
  tier: SeasonTier | undefined;
  level: number;
  isPremium: boolean;
  isReached: boolean;
  isClaimed: boolean;
  hasPremiumPass: boolean;
  claiming: boolean;
  onClaim?: () => void;
  isCurrent: boolean;
}) {
  if (!tier) {
    // Empty slot
    return (
      <div
        className={`h-20 rounded-lg border border-dashed flex items-center justify-center ${
          isPremium
            ? "border-amber-500/10 bg-amber-500/[0.02]"
            : "border-zinc-800/50 bg-zinc-900/20"
        }`}
      >
        <span className="text-zinc-700 text-[10px]">
          {isPremium ? "Premium" : "Free"}
        </span>
      </div>
    );
  }

  const RewardIcon = rewardIcons[tier.rewardType] || Gift;
  const isLocked = isPremium && !hasPremiumPass;
  const canClaim = isReached && !isClaimed && !isLocked && onClaim;

  return (
    <div
      className={`h-20 rounded-lg border flex flex-col items-center justify-center gap-1 relative transition-all ${
        isClaimed
          ? "border-green-500/30 bg-green-500/5"
          : canClaim
            ? "border-rust-500/50 bg-rust-500/5 ring-1 ring-rust-500/20 cursor-pointer hover:bg-rust-500/10"
            : isLocked
              ? "border-amber-500/20 bg-amber-500/[0.03] opacity-60"
              : isReached
                ? "border-zinc-700 bg-zinc-800/50"
                : isCurrent
                  ? "border-zinc-700 bg-zinc-800/30"
                  : "border-zinc-800/60 bg-zinc-900/30 opacity-40"
      }`}
      onClick={canClaim ? onClaim : undefined}
    >
      {/* Lock for premium without pass */}
      {isLocked && (
        <div className="absolute top-1 right-1">
          <Lock className="h-3 w-3 text-amber-500/50" />
        </div>
      )}

      {/* Claimed Check */}
      {isClaimed && (
        <div className="absolute top-1 right-1">
          <Check className="h-3 w-3 text-green-400" />
        </div>
      )}

      {/* Reward Icon */}
      <RewardIcon
        className={`h-5 w-5 ${
          isClaimed
            ? "text-green-400"
            : canClaim
              ? "text-rust-400"
              : isReached
                ? "text-zinc-400"
                : "text-zinc-600"
        }`}
      />

      {/* Reward Label */}
      <span
        className={`text-[10px] font-medium text-center leading-tight px-1 ${
          isClaimed
            ? "text-green-400/80"
            : canClaim
              ? "text-rust-300"
              : isReached
                ? "text-zinc-400"
                : "text-zinc-600"
        }`}
      >
        {getRewardLabel(tier.rewardType, tier.rewardAmount)}
      </span>

      {/* Claim indicator */}
      {canClaim && !claiming && (
        <span className="text-[9px] text-rust-400 font-medium">Claim</span>
      )}
      {claiming && (
        <span className="text-[9px] text-zinc-400 animate-pulse">...</span>
      )}
    </div>
  );
}
