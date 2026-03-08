import { NextResponse } from "next/server";
import { prisma } from "@rustranked/database";

export async function GET() {
  try {
    const servers = await prisma.gameServer.findMany({
      where: {
        isActive: true,
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        category: true,
        teamLimit: true,
        wipeSchedule: true,
        mapSize: true,
        maxPlayers: true,
        displayOrder: true,
        connectUrl: true,
        ip: true,
        port: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ servers });
  } catch (error) {
    console.error("Failed to fetch servers:", error);
    return NextResponse.json(
      { error: "Failed to fetch servers" },
      { status: 500 }
    );
  }
}
