import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";
import { redirect } from "next/navigation";
import { SettingsContent } from "./settings-content";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings - RustRanked" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, hideStats: true },
  });

  if (!user) {
    redirect("/login");
  }

  // Get accepted friends list
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

  const friendsList = [
    ...sent.map((f) => ({ friendshipId: f.id, user: f.addressee })),
    ...received.map((f) => ({ friendshipId: f.id, user: f.requester })),
  ];

  // Get pending requests
  const pendingRequests = await prisma.friendship.findMany({
    where: { addresseeId: user.id, status: "PENDING" },
    include: {
      requester: { select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get top friends
  const topFriends = await prisma.topFriend.findMany({
    where: { userId: user.id },
    include: {
      friend: { select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true } },
    },
    orderBy: { position: "asc" },
  });

  return (
    <SettingsContent
      hideStats={user.hideStats}
      friendsList={friendsList.map((f) => ({
        friendshipId: f.friendshipId,
        user: {
          id: f.user.id,
          steamId: f.user.steamId,
          steamName: f.user.steamName,
          discordName: f.user.discordName,
          discordAvatar: f.user.discordAvatar,
        },
      }))}
      pendingRequests={pendingRequests.map((r) => ({
        friendshipId: r.id,
        user: {
          id: r.requester.id,
          steamId: r.requester.steamId,
          steamName: r.requester.steamName,
          discordName: r.requester.discordName,
          discordAvatar: r.requester.discordAvatar,
        },
        createdAt: r.createdAt.toISOString(),
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
    />
  );
}
