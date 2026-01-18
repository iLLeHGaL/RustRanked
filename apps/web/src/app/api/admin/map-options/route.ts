import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",") || [];

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return false;
  return ADMIN_DISCORD_IDS.includes(session.user.discordId);
}

// GET - List all map options
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const mapOptions = await prisma.mapOption.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { votes: true },
      },
    },
  });

  return NextResponse.json({ mapOptions });
}

// POST - Create a new map option
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, imageUrl } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const mapOption = await prisma.mapOption.create({
      data: {
        name,
        description,
        imageUrl,
      },
    });

    return NextResponse.json({ mapOption });
  } catch (error) {
    console.error("Create map option error:", error);
    return NextResponse.json(
      { error: "Failed to create map option" },
      { status: 500 }
    );
  }
}

// PUT - Update a map option
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, description, imageUrl } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const mapOption = await prisma.mapOption.update({
      where: { id },
      data: {
        name,
        description,
        imageUrl,
      },
    });

    return NextResponse.json({ mapOption });
  } catch (error) {
    console.error("Update map option error:", error);
    return NextResponse.json(
      { error: "Failed to update map option" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a map option
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

    await prisma.mapOption.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete map option error:", error);
    return NextResponse.json(
      { error: "Failed to delete map option" },
      { status: 500 }
    );
  }
}
