// XP Engine - Battle Pass level progression calculations
//
// Default formula: XP_for_level(n) = baseXp + (n - 1) * increase
// With defaults:   XP_for_level(n) = 1000 + (n - 1) * 200
//
// Level 1:  1,000 XP  | Level 10: 14,500 cumulative
// Level 25: 58,000    | Level 50: 188,500 cumulative

interface SeasonXpConfig {
  baseXp: number;
  increase: number;
}

const DEFAULT_BASE_XP = 1000;
const DEFAULT_INCREASE = 200;

/** XP required to complete a specific level (not cumulative) */
export function xpForLevel(
  level: number,
  baseXp = DEFAULT_BASE_XP,
  increase = DEFAULT_INCREASE,
): number {
  if (level < 1) return 0;
  return baseXp + (level - 1) * increase;
}

/** Total cumulative XP required to reach a given level (sum of all levels 1..level) */
export function totalXpForLevel(
  level: number,
  baseXp = DEFAULT_BASE_XP,
  increase = DEFAULT_INCREASE,
): number {
  if (level < 1) return 0;
  // Sum of arithmetic series: n * baseXp + increase * n * (n - 1) / 2
  return level * baseXp + increase * level * (level - 1) / 2;
}

/** Calculate level from total cumulative XP (inverse of totalXpForLevel) */
export function levelFromXp(
  xp: number,
  baseXp = DEFAULT_BASE_XP,
  increase = DEFAULT_INCREASE,
): number {
  if (xp <= 0) return 0;

  if (increase === 0) {
    // Linear case: each level costs baseXp
    return Math.floor(xp / baseXp);
  }

  // Solve: increase/2 * n^2 + (baseXp - increase/2) * n - xp = 0
  // Using quadratic formula: n = (-b + sqrt(b^2 + 4ac)) / (2a)
  const a = increase / 2;
  const b = baseXp - increase / 2;
  const c = -xp;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) return 0;

  const n = (-b + Math.sqrt(discriminant)) / (2 * a);
  return Math.max(0, Math.floor(n));
}

/** XP remaining to reach the next level */
export function xpToNextLevel(
  currentXp: number,
  baseXp = DEFAULT_BASE_XP,
  increase = DEFAULT_INCREASE,
): { remaining: number; required: number; progress: number } {
  const currentLevel = levelFromXp(currentXp, baseXp, increase);
  const xpForCurrentLevel = totalXpForLevel(currentLevel, baseXp, increase);
  const xpForNext = totalXpForLevel(currentLevel + 1, baseXp, increase);
  const required = xpForNext - xpForCurrentLevel;
  const progressXp = currentXp - xpForCurrentLevel;

  return {
    remaining: required - progressXp,
    required,
    progress: required > 0 ? progressXp / required : 0,
  };
}

/** Parse xpPerLevel JSON from Season model into config params */
export function getSeasonConfig(xpPerLevel: unknown): SeasonXpConfig {
  if (
    typeof xpPerLevel === "object" &&
    xpPerLevel !== null &&
    "baseXp" in xpPerLevel &&
    "increase" in xpPerLevel
  ) {
    const config = xpPerLevel as { baseXp: unknown; increase: unknown };
    return {
      baseXp: typeof config.baseXp === "number" ? config.baseXp : DEFAULT_BASE_XP,
      increase: typeof config.increase === "number" ? config.increase : DEFAULT_INCREASE,
    };
  }
  return { baseXp: DEFAULT_BASE_XP, increase: DEFAULT_INCREASE };
}

// XP source values for stat-based XP awards
export const XP_SOURCES = {
  KILL: 50,
  HEADSHOT_BONUS: 25, // Added on top of KILL
  DEATH: 5,
  RESOURCES_PER_1000: 12, // 10-15 average
  ROCKET_USED: 17,       // 15-20 average
  EXPLOSIVE_USED: 17,
  STRUCTURE_DESTROYED: 30,
  PLAYTIME_PER_HOUR: 100,
  PLAYTIME_DAILY_CAP: 1000,
  DAILY_LOGIN: 200,
  LOGIN_STREAK_7DAY_BONUS: 500,
} as const;
