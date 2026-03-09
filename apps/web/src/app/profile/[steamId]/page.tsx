import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";
import { notFound } from "next/navigation";
import { ProfileContent } from "./profile-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;
  const user = await prisma.user.findUnique({
    where: { steamId },
    select: { steamName: true, discordName: true },
  });
  const name = user?.steamName ?? user?.discordName ?? steamId;
  return { title: `${name} - RustRanked Profile` };
}

export default async function ProfilePage({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;

  const user = await prisma.user.findUnique({
    where: { steamId },
    include: {
      vipAccess: {
        where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
        include: { server: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.id === user.id;

  // Increment views if not owner
  if (!isOwner) {
    await prisma.user.update({
      where: { steamId },
      data: { profileViews: { increment: 1 } },
    });
  }

  // Aggregate total hours + key stats
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

  // Friendship status with viewer
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

  // Pending count (owner only)
  let pendingCount = 0;
  if (isOwner) {
    pendingCount = await prisma.friendship.count({
      where: { addresseeId: user.id, status: "PENDING" },
    });
  }

  // Get accepted friends list (owner only, for top friends editing)
  let friendsList: { friendshipId: string; user: { id: string; steamId: string | null; steamName: string | null; discordName: string; discordAvatar: string | null } }[] = [];
  if (isOwner) {
    const [sent, received] = await Promise.all([
      prisma.friendship.findMany({
        where: { requesterId: user.id, status: "ACCEPTED" },
        include: { addressee: { select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true } } },
      }),
      prisma.friendship.findMany({
        where: { addresseeId: user.id, status: "ACCEPTED" },
        include: { requester: { select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true } } },
      }),
    ]);
    friendsList = [
      ...sent.map((f) => ({ friendshipId: f.id, user: f.addressee })),
      ...received.map((f) => ({ friendshipId: f.id, user: f.requester })),
    ];
  }

  const stats = {
    totalHours: statsAgg._sum.hoursPlayed ?? 0,
    kills: statsAgg._sum.kills ?? 0,
    deaths: statsAgg._sum.deaths ?? 0,
    headshots: statsAgg._sum.headshots ?? 0,
    resourcesGathered: statsAgg._sum.resourcesGathered ?? 0,
    woodGathered: statsAgg._sum.woodGathered ?? 0,
    stoneGathered: statsAgg._sum.stoneGathered ?? 0,
    metalOreGathered: statsAgg._sum.metalOreGathered ?? 0,
    sulfurOreGathered: statsAgg._sum.sulfurOreGathered ?? 0,
  };

  return (
    <ProfileContent
      user={{
        id: user.id,
        steamId: user.steamId!,
        steamName: user.steamName,
        steamAvatar: user.steamAvatar,
        discordName: user.discordName,
        discordAvatar: user.discordAvatar,
        verificationStatus: user.verificationStatus,
        profileViews: isOwner ? user.profileViews : user.profileViews + 1,
        createdAt: user.createdAt.toISOString(),
        vipAccess: user.vipAccess.map((v) => ({
          id: v.id,
          type: v.type,
          expiresAt: v.expiresAt.toISOString(),
          serverName: v.server.name,
        })),
      }}
      isOwner={isOwner}
      stats={stats}
      trophies={trophies.map((t) => ({
        id: t.id,
        rank: t.rank,
        category: t.category,
        statValue: t.statValue,
        serverName: t.server.name,
        wipeId: t.wipeId,
      }))}
      topFriends={topFriends.map((tf) => ({
        position: tf.position,
        user: {
          id: tf.friend.id,
          steamId: tf.friend.steamId,
          steamName: tf.friend.steamName,
          discordName: tf.friend.discordName,
          discordAvatar: tf.friend.discordAvatar,
        },
      }))}
      friendshipStatus={friendshipStatus}
      pendingCount={pendingCount}
      friendsList={friendsList}
    />
  );
}
