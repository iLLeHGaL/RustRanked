import { NextRequest, NextResponse } from "next/server";
import { verifyServerRequest } from "@/lib/server-auth";
import { prisma } from "@rustranked/database";

// Report player stats (kills, deaths) during gameplay
export async function POST(request: NextRequest) {
  const auth = await verifyServerRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { steamId, kills, deaths } = body;

    if (!steamId) {
      return NextResponse.json(
        { error: "steamId is required" },
        { status: 400 }
      );
    }

    // Find user by Steam ID
    const user = await prisma.user.findUnique({
      where: { steamId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update stats (increment)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        kills: { increment: kills || 0 },
        deaths: { increment: deaths || 0 },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        kills: updatedUser.kills,
        deaths: updatedUser.deaths,
      },
    });
  } catch (error) {
    console.error("Report stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
