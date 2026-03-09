import { prisma } from "@rustranked/database";
import { notFound } from "next/navigation";
import { TrophiesContent } from "./trophies-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;
  const user = await prisma.user.findUnique({
    where: { steamId },
    select: { steamName: true, discordName: true },
  });
  const name = user?.steamName ?? user?.discordName ?? steamId;
  return { title: `${name}'s Trophies - RustRanked` };
}

export default async function TrophiesPage({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;

  const user = await prisma.user.findUnique({
    where: { steamId },
    select: { steamName: true, discordName: true },
  });

  if (!user) {
    notFound();
  }

  const trophies = await prisma.trophy.findMany({
    where: { steamId },
    include: { server: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <TrophiesContent
      steamId={steamId}
      playerName={user.steamName ?? user.discordName}
      trophies={trophies.map((t) => ({
        id: t.id,
        rank: t.rank,
        category: t.category,
        statValue: t.statValue,
        serverName: t.server.name,
        wipeId: t.wipeId,
      }))}
    />
  );
}
