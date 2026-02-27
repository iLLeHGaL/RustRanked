import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateApiKey } from "@/lib/server-auth";
import { prisma } from "@rustranked/database";

// For now, admin is hardcoded. In production, add proper admin role checking
const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",") || [];

async function isAdmin(request: NextRequest): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return false;
  return ADMIN_DISCORD_IDS.includes(session.user.discordId);
}

// GET - List all servers
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const servers = await prisma.gameServer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      ip: true,
      port: true,
      isActive: true,
      lastSeen: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ servers });
}

// POST - Register a new server
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, ip, port, rconPort } = body;

    if (!name || !ip || !port) {
      return NextResponse.json(
        { error: "name, ip, and port are required" },
        { status: 400 }
      );
    }

    // Check if server already exists
    const existing = await prisma.gameServer.findFirst({
      where: { ip, port },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Server with this IP:port already exists" },
        { status: 400 }
      );
    }

    // Generate API key
    const { key, hash } = generateApiKey();

    // Create server
    const server = await prisma.gameServer.create({
      data: {
        name,
        description,
        ip,
        port,
        rconPort,
        apiKeyHash: hash,
        isActive: true,
      },
    });

    // Return the API key (only shown once!)
    return NextResponse.json({
      success: true,
      server: {
        id: server.id,
        name: server.name,
        ip: server.ip,
        port: server.port,
      },
      apiKey: key, // Only returned on creation!
      warning: "Save this API key! It will not be shown again.",
    });
  } catch (error) {
    console.error("Create server error:", error);
    return NextResponse.json(
      { error: "Failed to create server" },
      { status: 500 }
    );
  }
}
