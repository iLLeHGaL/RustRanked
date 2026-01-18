import { NextRequest, NextResponse } from "next/server";
import { verifyServerRequest } from "@/lib/server-auth";
import { prisma, Team } from "@rustranked/database";

// Start a new match
export async function POST(request: NextRequest) {
  const auth = await verifyServerRequest(request);
  if (!auth.authorized || !auth.server) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { players } = body;

    // players should be array of { steamId, team: "TEAM_A" | "TEAM_B" }
    if (!players || !Array.isArray(players) || players.length < 2) {
      return NextResponse.json(
        { error: "At least 2 players required" },
        { status: 400 }
      );
    }

    // Validate teams
    const teamA = players.filter((p: { team: string }) => p.team === "TEAM_A");
    const teamB = players.filter((p: { team: string }) => p.team === "TEAM_B");

    if (teamA.length === 0 || teamB.length === 0) {
      return NextResponse.json(
        { error: "Both teams must have at least 1 player" },
        { status: 400 }
      );
    }

    // Get all users by steam IDs
    const steamIds = players.map((p: { steamId: string }) => p.steamId);
    const users = await prisma.user.findMany({
      where: { steamId: { in: steamIds } },
    });

    if (users.length !== players.length) {
      return NextResponse.json(
        { error: "Some players not found" },
        { status: 400 }
      );
    }

    // Create the match
    const match = await prisma.match.create({
      data: {
        serverId: auth.server.id,
        status: "IN_PROGRESS",
        players: {
          create: players.map((p: { steamId: string; team: string }) => {
            const user = users.find((u) => u.steamId === p.steamId)!;
            return {
              userId: user.id,
              team: p.team as Team,
              eloBefore: user.elo,
              eloAfter: user.elo, // Will be updated when match ends
            };
          }),
        },
      },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                discordName: true,
                steamName: true,
                steamId: true,
                elo: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      matchId: match.id,
      players: match.players.map((mp) => ({
        userId: mp.user.id,
        steamId: mp.user.steamId,
        team: mp.team,
        elo: mp.eloBefore,
      })),
    });
  } catch (error) {
    console.error("Start match error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
