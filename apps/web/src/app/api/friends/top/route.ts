import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

// GET - get user's top friends
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topFriends = await prisma.topFriend.findMany({
    where: { userId: session.user.id },
    include: {
      friend: {
        select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true },
      },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({ topFriends });
}

// PUT - set top friends (max 5)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friends } = await request.json() as { friends: { friendId: string; position: number }[] };

  if (!Array.isArray(friends) || friends.length > 5) {
    return NextResponse.json({ error: "Max 5 top friends" }, { status: 400 });
  }

  // Validate positions 1-5
  const positions = friends.map((f) => f.position);
  if (positions.some((p) => p < 1 || p > 5) || new Set(positions).size !== positions.length) {
    return NextResponse.json({ error: "Invalid positions" }, { status: 400 });
  }

  // Validate all are accepted friends
  const friendIds = friends.map((f) => f.friendId);
  const acceptedFriendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: session.user.id, addresseeId: { in: friendIds } },
        { addresseeId: session.user.id, requesterId: { in: friendIds } },
      ],
    },
  });

  const validFriendIds = new Set<string>();
  for (const f of acceptedFriendships) {
    validFriendIds.add(f.requesterId === session.user.id ? f.addresseeId : f.requesterId);
  }

  const allValid = friendIds.every((id) => validFriendIds.has(id));
  if (!allValid) {
    return NextResponse.json({ error: "Some users are not your friends" }, { status: 400 });
  }

  // Replace all top friends in a transaction
  await prisma.$transaction([
    prisma.topFriend.deleteMany({ where: { userId: session.user.id } }),
    ...friends.map((f) =>
      prisma.topFriend.create({
        data: { userId: session.user.id, friendId: f.friendId, position: f.position },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
