export interface RankTier {
  name: string;
  minHours: number;
  color: string;
  textClass: string;
  bgClass: string;
}

export const RANK_TIERS: RankTier[] = [
  { name: "Unranked", minHours: 0, color: "#71717a", textClass: "text-zinc-500", bgClass: "bg-zinc-500/10" },
  { name: "Stone", minHours: 1, color: "#a8a29e", textClass: "text-stone-400", bgClass: "bg-stone-400/10" },
  { name: "Wood", minHours: 5, color: "#b45309", textClass: "text-amber-700", bgClass: "bg-amber-700/10" },
  { name: "Bronze", minHours: 15, color: "#ea580c", textClass: "text-orange-600", bgClass: "bg-orange-600/10" },
  { name: "Silver", minHours: 30, color: "#d4d4d8", textClass: "text-zinc-300", bgClass: "bg-zinc-300/10" },
  { name: "Gold", minHours: 60, color: "#facc15", textClass: "text-yellow-400", bgClass: "bg-yellow-400/10" },
  { name: "Platinum", minHours: 120, color: "#67e8f9", textClass: "text-cyan-300", bgClass: "bg-cyan-300/10" },
  { name: "Diamond", minHours: 250, color: "#60a5fa", textClass: "text-blue-400", bgClass: "bg-blue-400/10" },
  { name: "Obsidian", minHours: 500, color: "#a855f7", textClass: "text-purple-500", bgClass: "bg-purple-500/10" },
  { name: "Rust Lord", minHours: 1000, color: "#ef4444", textClass: "text-rust-500", bgClass: "bg-rust-500/10" },
];

export function getRankForHours(hours: number): RankTier {
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (hours >= tier.minHours) {
      rank = tier;
    } else {
      break;
    }
  }
  return rank;
}

export function getRankProgress(hours: number): { current: RankTier; next: RankTier | null; progress: number } {
  const current = getRankForHours(hours);
  const currentIndex = RANK_TIERS.indexOf(current);
  const next = currentIndex < RANK_TIERS.length - 1 ? RANK_TIERS[currentIndex + 1] : null;

  if (!next) {
    return { current, next: null, progress: 1 };
  }

  const progressHours = hours - current.minHours;
  const totalHours = next.minHours - current.minHours;
  const progress = Math.min(progressHours / totalHours, 1);

  return { current, next, progress };
}
