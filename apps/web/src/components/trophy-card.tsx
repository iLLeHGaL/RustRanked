import { Trophy } from "lucide-react";

const MEDAL_COLORS = {
  1: { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  2: { text: "text-zinc-300", bg: "bg-zinc-300/10", border: "border-zinc-300/30" },
  3: { text: "text-orange-600", bg: "bg-orange-600/10", border: "border-orange-600/30" },
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  MOST_KILLS: "Most Kills",
  MOST_RESOURCES: "Most Resources",
  MOST_GAMBLING_PROFIT: "Most Gambling Profit",
};

export function TrophyCard({
  rank,
  category,
  statValue,
  serverName,
  wipeId,
}: {
  rank: number;
  category: string;
  statValue: number;
  serverName?: string;
  wipeId: string;
}) {
  const medal = MEDAL_COLORS[rank as 1 | 2 | 3] ?? MEDAL_COLORS[3];
  const ordinal = rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd";

  return (
    <div className={`card border ${medal.border} ${medal.bg}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${medal.bg}`}>
          <Trophy className={`h-5 w-5 ${medal.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${medal.text}`}>{ordinal}</span>
            <span className="text-sm text-white font-medium truncate">
              {CATEGORY_LABELS[category] ?? category}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {statValue.toLocaleString()} &middot; {serverName ?? "Unknown"} &middot; {wipeId}
          </p>
        </div>
      </div>
    </div>
  );
}
