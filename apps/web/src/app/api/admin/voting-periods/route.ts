import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

// Server types - matches Prisma enum
const ServerType = {
  US_MAIN: "US_MAIN",
  US_MONDAYS: "US_MONDAYS",
  EU_MAIN: "EU_MAIN",
  EU_MONDAYS: "EU_MONDAYS",
} as const;

const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",") || [];

async function isAdmin(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return null;
  if (!ADMIN_DISCORD_IDS.includes(session.user.discordId)) return null;
  return session.user.discordId;
}

// GET - List all voting periods
export async function GET() {
  const adminId = await isAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const votingPeriods = await prisma.votingPeriod.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      mapOptions: {
        include: {
          mapOption: true,
        },
      },
      _count: {
        select: { votes: true },
      },
    },
  });

  return NextResponse.json({ votingPeriods });
}

// POST - Create a new voting period
export async function POST(request: NextRequest) {
  const adminId = await isAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { serverType, startsAt, endsAt, wipeDate, mapOptionIds } = body;

    if (!serverType || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: "serverType, startsAt, and endsAt are required" },
        { status: 400 }
      );
    }

    // Validate server type
    if (!Object.values(ServerType).includes(serverType)) {
      return NextResponse.json(
        { error: "Invalid serverType" },
        { status: 400 }
      );
    }

    // Create voting period with map options
    const votingPeriod = await prisma.votingPeriod.create({
      data: {
        serverType,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        wipeDate: wipeDate ? new Date(wipeDate) : null,
        createdBy: adminId,
        mapOptions: {
          create: (mapOptionIds || []).map((mapOptionId: string) => ({
            mapOptionId,
          })),
        },
      },
      include: {
        mapOptions: {
          include: {
            mapOption: true,
          },
        },
      },
    });

    return NextResponse.json({ votingPeriod });
  } catch (error) {
    console.error("Create voting period error:", error);
    return NextResponse.json(
      { error: "Failed to create voting period" },
      { status: 500 }
    );
  }
}

// PUT - Update a voting period (toggle active, update dates, etc.)
export async function PUT(request: NextRequest) {
  const adminId = await isAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, isActive, startsAt, endsAt, wipeDate, mapOptionIds } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (startsAt) updateData.startsAt = new Date(startsAt);
    if (endsAt) updateData.endsAt = new Date(endsAt);
    if (wipeDate !== undefined) updateData.wipeDate = wipeDate ? new Date(wipeDate) : null;

    // Update voting period
    const votingPeriod = await prisma.votingPeriod.update({
      where: { id },
      data: updateData,
      include: {
        mapOptions: {
          include: {
            mapOption: true,
          },
        },
      },
    });

    // If mapOptionIds provided, update the map options
    if (mapOptionIds) {
      // Delete existing map options
      await prisma.votingPeriodMap.deleteMany({
        where: { votingPeriodId: id },
      });

      // Create new map options
      await prisma.votingPeriodMap.createMany({
        data: mapOptionIds.map((mapOptionId: string) => ({
          votingPeriodId: id,
          mapOptionId,
        })),
      });
    }

    return NextResponse.json({ votingPeriod });
  } catch (error) {
    console.error("Update voting period error:", error);
    return NextResponse.json(
      { error: "Failed to update voting period" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a voting period
export async function DELETE(request: NextRequest) {
  const adminId = await isAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.votingPeriod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete voting period error:", error);
    return NextResponse.json(
      { error: "Failed to delete voting period" },
      { status: 500 }
    );
  }
}
