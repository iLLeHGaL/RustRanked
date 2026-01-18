import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateApiKey } from "@/lib/server-auth";
import { prisma } from "@rustranked/database";

const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",") || [];

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return false;
  return ADMIN_DISCORD_IDS.includes(session.user.discordId);
}

// PATCH - Update server
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, ip, port, rconPort, isActive } = body;

    const server = await prisma.gameServer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(ip !== undefined && { ip }),
        ...(port !== undefined && { port }),
        ...(rconPort !== undefined && { rconPort }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, server });
  } catch (error) {
    console.error("Update server error:", error);
    return NextResponse.json(
      { error: "Failed to update server" },
      { status: 500 }
    );
  }
}

// DELETE - Remove server
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.gameServer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete server error:", error);
    return NextResponse.json(
      { error: "Failed to delete server" },
      { status: 500 }
    );
  }
}

// POST - Regenerate API key
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { key, hash } = generateApiKey();

    await prisma.gameServer.update({
      where: { id },
      data: { apiKeyHash: hash },
    });

    return NextResponse.json({
      success: true,
      apiKey: key,
      warning: "Save this API key! It will not be shown again.",
    });
  } catch (error) {
    console.error("Regenerate key error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate API key" },
      { status: 500 }
    );
  }
}
