// ELO Rating System for RustRanked

// K-factor determines how much ratings change after each match
// Higher K = more volatile ratings
const K_FACTOR_NEW = 40; // New players (< 10 matches)
const K_FACTOR_NORMAL = 24; // Regular players
const K_FACTOR_VETERAN = 16; // Veterans (> 100 matches)

// Starting ELO
export const STARTING_ELO = 1000;

// Rank tiers
export const RANK_TIERS = {
  BRONZE: { min: 0, max: 799, name: "Bronze", color: "#CD7F32" },
  SILVER: { min: 800, max: 1199, name: "Silver", color: "#C0C0C0" },
  GOLD: { min: 1200, max: 1599, name: "Gold", color: "#FFD700" },
  PLATINUM: { min: 1600, max: 1999, name: "Platinum", color: "#E5E4E2" },
  DIAMOND: { min: 2000, max: 2399, name: "Diamond", color: "#B9F2FF" },
  MASTER: { min: 2400, max: 2799, name: "Master", color: "#9966CC" },
  GRANDMASTER: { min: 2800, max: Infinity, name: "Grandmaster", color: "#FF4500" },
} as const;

export type RankTier = keyof typeof RANK_TIERS;

export function getRankTier(elo: number): RankTier {
  if (elo >= RANK_TIERS.GRANDMASTER.min) return "GRANDMASTER";
  if (elo >= RANK_TIERS.MASTER.min) return "MASTER";
  if (elo >= RANK_TIERS.DIAMOND.min) return "DIAMOND";
  if (elo >= RANK_TIERS.PLATINUM.min) return "PLATINUM";
  if (elo >= RANK_TIERS.GOLD.min) return "GOLD";
  if (elo >= RANK_TIERS.SILVER.min) return "SILVER";
  return "BRONZE";
}

export function getRankInfo(elo: number) {
  const tier = getRankTier(elo);
  return {
    tier,
    ...RANK_TIERS[tier],
  };
}

function getKFactor(matchesPlayed: number): number {
  if (matchesPlayed < 10) return K_FACTOR_NEW;
  if (matchesPlayed > 100) return K_FACTOR_VETERAN;
  return K_FACTOR_NORMAL;
}

// Calculate expected win probability
function getExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

// Calculate ELO change for a single player
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  won: boolean,
  matchesPlayed: number
): number {
  const expected = getExpectedScore(playerElo, opponentElo);
  const actual = won ? 1 : 0;
  const k = getKFactor(matchesPlayed);

  return Math.round(k * (actual - expected));
}

// Team ELO is the average of all team members
export function calculateTeamElo(playerElos: number[]): number {
  if (playerElos.length === 0) return STARTING_ELO;
  return Math.round(playerElos.reduce((a, b) => a + b, 0) / playerElos.length);
}

export interface MatchPlayer {
  userId: string;
  currentElo: number;
  team: "TEAM_A" | "TEAM_B";
  matchesPlayed: number;
  kills?: number;
  deaths?: number;
}

export interface MatchResult {
  winningTeam: "TEAM_A" | "TEAM_B";
  players: MatchPlayer[];
}

// Calculate ELO changes for all players in a match
export function calculateMatchEloChanges(result: MatchResult): Map<string, number> {
  const { winningTeam, players } = result;
  const changes = new Map<string, number>();

  // Separate teams
  const teamA = players.filter((p) => p.team === "TEAM_A");
  const teamB = players.filter((p) => p.team === "TEAM_B");

  // Calculate team ELOs
  const teamAElo = calculateTeamElo(teamA.map((p) => p.currentElo));
  const teamBElo = calculateTeamElo(teamB.map((p) => p.currentElo));

  // Calculate changes for each player
  for (const player of players) {
    const won = player.team === winningTeam;
    const opponentTeamElo = player.team === "TEAM_A" ? teamBElo : teamAElo;

    const change = calculateEloChange(
      player.currentElo,
      opponentTeamElo,
      won,
      player.matchesPlayed
    );

    changes.set(player.userId, change);
  }

  return changes;
}

// Performance bonus based on K/D (optional modifier)
export function getPerformanceMultiplier(kills: number, deaths: number): number {
  if (deaths === 0) {
    return kills > 0 ? 1.2 : 1.0;
  }
  const kd = kills / deaths;
  if (kd >= 3.0) return 1.15;
  if (kd >= 2.0) return 1.10;
  if (kd >= 1.5) return 1.05;
  if (kd <= 0.5) return 0.95;
  return 1.0;
}

// Ensure ELO doesn't go below minimum
export function clampElo(elo: number, minElo: number = 100): number {
  return Math.max(minElo, elo);
}
