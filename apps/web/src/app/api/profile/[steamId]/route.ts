import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ steamId: string }> }
) {
  const { steamId } = await params;

  const user = await prisma.user.findUnique({
    where: { steamId },
    select: {
      id: true,
      steamId: true,
      steamName: true,
      steamAvatar: true,
      discordName: true,
      discordAvatar: true,
      verificationStatus: true,
      profileViews: true,
      createdAt: true,
      vipAccess: {
        where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
        include: { server: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Check if viewer is the owner
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.id === user.id;

  // Increment profile views if not owner
  if (!isOwner) {
    await prisma.user.update({
      where: { steamId },
      data: { profileViews: { increment: 1 } },
    });
  }

  // Get total hours and aggregated stats
  const statsAgg = await prisma.wipeStats.aggregate({
    where: { steamId },
    _sum: {
      hoursPlayed: true,
      kills: true,
      deaths: true,
      headshots: true,
      resourcesGathered: true,
      woodGathered: true,
      stoneGathered: true,
      metalOreGathered: true,
      sulfurOreGathered: true,
    },
  });

  // Get trophies
  const trophies = await prisma.trophy.findMany({
    where: { steamId },
    include: { server: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get top friends
  const topFriends = await prisma.topFriend.findMany({
    where: { userId: user.id },
    include: {
      friend: {
        select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true },
      },
    },
    orderBy: { position: "asc" },
  });

  // Check friendship status with viewer
  let friendshipStatus: { friendshipId: string; status: string; direction: string } | null = null;
  if (session?.user?.id && !isOwner) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, addresseeId: user.id },
          { requesterId: user.id, addresseeId: session.user.id },
        ],
      },
    });
    if (friendship) {
      friendshipStatus = {
        friendshipId: friendship.id,
        status: friendship.status,
        direction: friendship.requesterId === session.user.id ? "sent" : "received",
      };
    }
  }

  // Pending friend request count (owner only)
  let pendingCount = 0;
  if (isOwner) {
    pendingCount = await prisma.friendship.count({
      where: { addresseeId: user.id, status: "PENDING" },
    });
  }

  return NextResponse.json({
    user: {
      ...user,
      profileViews: isOwner ? user.profileViews : user.profileViews + 1,
    },
    isOwner,
    stats: {
      totalHours: statsAgg._sum.hoursPlayed ?? 0,
      kills: statsAgg._sum.kills ?? 0,
      deaths: statsAgg._sum.deaths ?? 0,
      headshots: statsAgg._sum.headshots ?? 0,
      resourcesGathered: statsAgg._sum.resourcesGathered ?? 0,
      woodGathered: statsAgg._sum.woodGathered ?? 0,
      stoneGathered: statsAgg._sum.stoneGathered ?? 0,
      metalOreGathered: statsAgg._sum.metalOreGathered ?? 0,
      sulfurOreGathered: statsAgg._sum.sulfurOreGathered ?? 0,
    },
    trophies: trophies.map((t) => ({
      id: t.id,
      rank: t.rank,
      category: t.category,
      statValue: t.statValue,
      serverName: t.server.name,
      wipeId: t.wipeId,
    })),
    topFriends: topFriends.map((tf) => ({
      position: tf.position,
      user: tf.friend,
    })),
    friendshipStatus,
    pendingCount,
  });
}
