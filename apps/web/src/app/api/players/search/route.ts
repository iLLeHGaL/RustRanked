import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@rustranked/database";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ players: [] });
  }

  const players = await prisma.user.findMany({
    where: {
      steamId: { not: null },
      OR: [
        { steamName: { contains: q, mode: "insensitive" } },
        { discordName: { contains: q, mode: "insensitive" } },
        { steamId: q },
      ],
    },
    select: {
      steamId: true,
      steamName: true,
      discordName: true,
      discordAvatar: true,
      steamAvatar: true,
    },
    take: 20,
  });

  return NextResponse.json({ players });
}
