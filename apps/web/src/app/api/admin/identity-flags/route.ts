import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, IdentityFlagStatus } from "@rustranked/database";

const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",") || [];

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return false;
  return ADMIN_DISCORD_IDS.includes(session.user.discordId);
}

// GET - List identity flags with optional status filter
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (status && Object.values(IdentityFlagStatus).includes(status as IdentityFlagStatus)) {
    where.status = status;
  }

  const flags = await prisma.identityFlag.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      flaggedUser: {
        select: {
          id: true,
          discordId: true,
          discordName: true,
          discordAvatar: true,
          steamId: true,
          steamName: true,
          verificationStatus: true,
        },
      },
      matchedUser: {
        select: {
          id: true,
          discordId: true,
          discordName: true,
          discordAvatar: true,
          steamId: true,
          steamName: true,
          verificationStatus: true,
          bans: {
            where: { isActive: true },
            select: { id: true, reason: true, createdAt: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ flags });
}

// PUT - Resolve a flag
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);

  try {
    const body = await request.json();
    const { flagId, status, resolution, banUser } = body;

    if (!flagId || !status) {
      return NextResponse.json(
        { error: "flagId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses: IdentityFlagStatus[] = [
      IdentityFlagStatus.CONFIRMED_ALT,
      IdentityFlagStatus.FALSE_POSITIVE,
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "status must be CONFIRMED_ALT or FALSE_POSITIVE" },
        { status: 400 }
      );
    }

    const flag = await prisma.identityFlag.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      return NextResponse.json(
        { error: "Flag not found" },
        { status: 404 }
      );
    }

    const operations: any[] = [
      prisma.identityFlag.update({
        where: { id: flagId },
        data: {
          status,
          resolvedBy: session?.user?.discordId || "unknown",
          resolvedAt: new Date(),
          resolution: resolution || null,
        },
      }),
    ];

    if (banUser && status === IdentityFlagStatus.CONFIRMED_ALT) {
      operations.push(
        prisma.ban.create({
          data: {
            userId: flag.flaggedUserId,
            reason: resolution || "Confirmed alt account",
            bannedBy: session?.user?.discordId || "ADMIN",
            isActive: true,
          },
        })
      );
    }

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resolve identity flag error:", error);
    return NextResponse.json(
      { error: "Failed to resolve flag" },
      { status: 500 }
    );
  }
}
