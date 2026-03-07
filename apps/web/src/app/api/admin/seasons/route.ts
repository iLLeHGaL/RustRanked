import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, SeasonStatus } from "@rustranked/database";

const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",") || [];

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return false;
  return ADMIN_DISCORD_IDS.includes(session.user.discordId);
}

// GET - List all seasons
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const seasons = await prisma.season.findMany({
    orderBy: { number: "desc" },
    include: {
      _count: {
        select: {
          playerSeasons: true,
          tiers: true,
        },
      },
    },
  });

  return NextResponse.json({ seasons });
}

// POST - Create a new season
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, number, startsAt, endsAt, maxLevel, xpPerLevel } = body;

    if (!name || number == null || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: "name, number, startsAt, and endsAt are required" },
        { status: 400 }
      );
    }

    // Check for duplicate season number
    const existing = await prisma.season.findUnique({
      where: { number },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Season number already exists" },
        { status: 400 }
      );
    }

    const season = await prisma.season.create({
      data: {
        name,
        number,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        maxLevel: maxLevel || 50,
        xpPerLevel: xpPerLevel || { baseXp: 1000, increase: 200 },
      },
    });

    return NextResponse.json({ season });
  } catch (error) {
    console.error("Create season error:", error);
    return NextResponse.json(
      { error: "Failed to create season" },
      { status: 500 }
    );
  }
}

// PUT - Update a season (including status changes)
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, status, startsAt, endsAt, maxLevel, xpPerLevel } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    // If setting to ACTIVE, ensure no other season is active
    if (status === SeasonStatus.ACTIVE) {
      const activeSeason = await prisma.season.findFirst({
        where: {
          status: SeasonStatus.ACTIVE,
          id: { not: id },
        },
      });
      if (activeSeason) {
        return NextResponse.json(
          {
            error: `Season "${activeSeason.name}" is already active. End it first.`,
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (startsAt !== undefined) updateData.startsAt = new Date(startsAt);
    if (endsAt !== undefined) updateData.endsAt = new Date(endsAt);
    if (maxLevel !== undefined) updateData.maxLevel = maxLevel;
    if (xpPerLevel !== undefined) updateData.xpPerLevel = xpPerLevel;

    const season = await prisma.season.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ season });
  } catch (error) {
    console.error("Update season error:", error);
    return NextResponse.json(
      { error: "Failed to update season" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a season (only if UPCOMING with no players)
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
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

    const season = await prisma.season.findUnique({
      where: { id },
      include: { _count: { select: { playerSeasons: true } } },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    if (season.status !== SeasonStatus.UPCOMING) {
      return NextResponse.json(
        { error: "Can only delete UPCOMING seasons" },
        { status: 400 }
      );
    }

    if (season._count.playerSeasons > 0) {
      return NextResponse.json(
        { error: "Cannot delete season with existing players" },
        { status: 400 }
      );
    }

    await prisma.season.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete season error:", error);
    return NextResponse.json(
      { error: "Failed to delete season" },
      { status: 500 }
    );
  }
}
