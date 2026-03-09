import { getRankForHours, type RankTier } from "@/lib/ranks";

export function RankBadge({
  hours,
  rank,
  size = "sm",
}: {
  hours?: number;
  rank?: RankTier;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const tier = rank ?? getRankForHours(hours ?? 0);

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${tier.bgClass} ${tier.textClass} ${sizeClasses[size]}`}
      style={{ borderColor: tier.color, borderWidth: "1px" }}
    >
      {tier.name}
    </span>
  );
}
