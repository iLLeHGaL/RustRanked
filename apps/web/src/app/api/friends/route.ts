import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

// GET - list accepted friends + pending incoming requests
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [sentAccepted, receivedAccepted, pendingIncoming] = await Promise.all([
    prisma.friendship.findMany({
      where: { requesterId: userId, status: "ACCEPTED" },
      include: { addressee: { select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true } } },
    }),
    prisma.friendship.findMany({
      where: { addresseeId: userId, status: "ACCEPTED" },
      include: { requester: { select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true } } },
    }),
    prisma.friendship.findMany({
      where: { addresseeId: userId, status: "PENDING" },
      include: { requester: { select: { id: true, steamId: true, steamName: true, discordName: true, discordAvatar: true } } },
    }),
  ]);

  const friends = [
    ...sentAccepted.map((f) => ({ friendshipId: f.id, user: f.addressee })),
    ...receivedAccepted.map((f) => ({ friendshipId: f.id, user: f.requester })),
  ];

  const pendingRequests = pendingIncoming.map((f) => ({
    friendshipId: f.id,
    user: f.requester,
    createdAt: f.createdAt,
  }));

  return NextResponse.json({ friends, pendingRequests });
}

// POST - send friend request by steamId
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { steamId } = await request.json();
  if (!steamId) {
    return NextResponse.json({ error: "steamId required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { steamId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (target.id === session.user.id) {
    return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
  }

  // Check for existing friendship in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, addresseeId: target.id },
        { requesterId: target.id, addresseeId: session.user.id },
      ],
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Friendship already exists", status: existing.status }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: session.user.id, addresseeId: target.id },
  });

  return NextResponse.json({ friendship }, { status: 201 });
}

// PATCH - accept/decline friend request
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendshipId, action } = await request.json();
  if (!friendshipId || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (friendship.status !== "PENDING") {
    return NextResponse.json({ error: "Already resolved" }, { status: 400 });
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: action === "accept" ? "ACCEPTED" : "DECLINED" },
  });

  return NextResponse.json({ friendship: updated });
}

// DELETE - remove friendship
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendshipId } = await request.json();
  if (!friendshipId) {
    return NextResponse.json({ error: "friendshipId required" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (friendship.requesterId !== session.user.id && friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });
  return NextResponse.json({ ok: true });
}
