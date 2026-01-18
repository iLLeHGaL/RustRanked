import { NextRequest, NextResponse } from "next/server";
import { verifyServerRequest } from "@/lib/server-auth";
import { calculateMatchEloChanges, clampElo, getRankInfo } from "@/lib/elo";
import { prisma, Team } from "@rustranked/database";

interface PlayerStats {
  steamId: string;
  kills: number;
  deaths: number;
  assists?: number;
}

// End a match and calculate ELO changes
export async function POST(request: NextRequest) {
  const auth = await verifyServerRequest(request);
  if (!auth.authorized || !auth.server) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { matchId, winningTeam, playerStats, duration } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId is required" },
        { status: 400 }
      );
    }

    if (!winningTeam || !["TEAM_A", "TEAM_B"].includes(winningTeam)) {
      return NextResponse.json(
        { error: "winningTeam must be TEAM_A or TEAM_B" },
        { status: 400 }
      );
    }

    // Get the match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Match already ended" },
        { status: 400 }
      );
    }

    if (match.serverId !== auth.server.id) {
      return NextResponse.json(
        { error: "Match belongs to different server" },
        { status: 403 }
      );
    }

    // Prepare data for ELO calculation
    const matchPlayers = match.players.map((mp) => ({
      userId: mp.userId,
      currentElo: mp.user.elo,
      team: mp.team as "TEAM_A" | "TEAM_B",
      matchesPlayed: mp.user.matchesPlayed,
    }));

    // Calculate ELO changes
    const eloChanges = calculateMatchEloChanges({
      winningTeam: winningTeam as "TEAM_A" | "TEAM_B",
      players: matchPlayers,
    });

    // Build player stats map
    const statsMap = new Map<string, PlayerStats>();
    if (playerStats && Array.isArray(playerStats)) {
      for (const ps of playerStats) {
        statsMap.set(ps.steamId, ps);
      }
    }

    // Update match and players in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const playerResults = [];

      for (const mp of match.players) {
        const eloChange = eloChanges.get(mp.userId) || 0;
        const newElo = clampElo(mp.user.elo + eloChange);
        const won = mp.team === winningTeam;

        // Get player stats if provided
        const stats = statsMap.get(mp.user.steamId || "");
        const kills = stats?.kills || 0;
        const deaths = stats?.deaths || 0;
        const assists = stats?.assists || 0;

        // Update match player
        await tx.matchPlayer.update({
          where: { id: mp.id },
          data: {
            eloChange,
            eloAfter: newElo,
            kills,
            deaths,
            assists,
          },
        });

        // Update user stats
        const updatedUser = await tx.user.update({
          where: { id: mp.userId },
          data: {
            elo: newElo,
            peakElo: newElo > mp.user.peakElo ? newElo : mp.user.peakElo,
            kills: { increment: kills },
            deaths: { increment: deaths },
            wins: { increment: won ? 1 : 0 },
            losses: { increment: won ? 0 : 1 },
            matchesPlayed: { increment: 1 },
          },
        });

        const rankInfo = getRankInfo(newElo);
        playerResults.push({
          userId: mp.userId,
          steamId: mp.user.steamId,
          team: mp.team,
          won,
          eloChange,
          oldElo: mp.user.elo,
          newElo,
          rank: rankInfo.tier,
          rankName: rankInfo.name,
        });
      }

      // Update match
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: "COMPLETED",
          winningTeam: winningTeam as Team,
          endedAt: new Date(),
          duration: duration || null,
        },
      });

      return playerResults;
    });

    return NextResponse.json({
      success: true,
      matchId,
      winningTeam,
      players: results,
    });
  } catch (error) {
    console.error("End match error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
