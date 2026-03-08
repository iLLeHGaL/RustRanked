import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVipCheckoutSession } from "@/lib/stripe";
import { prisma } from "@rustranked/database";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, serverId } = body as { type?: string; serverId?: string };

    if (type !== "monthly" && type !== "wipe") {
      return NextResponse.json(
        { error: "Invalid VIP type. Must be 'monthly' or 'wipe'" },
        { status: 400 }
      );
    }

    if (!serverId) {
      return NextResponse.json(
        { error: "Server selection is required" },
        { status: 400 }
      );
    }

    // Validate server exists and is active
    const server = await prisma.gameServer.findFirst({
      where: { id: serverId, isActive: true },
    });

    if (!server) {
      return NextResponse.json(
        { error: "Invalid server selection" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        vipAccess: {
          where: {
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
            type: type === "monthly" ? "MONTHLY" : "WIPE",
            serverId,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has active VIP of same type on this server
    if (user.vipAccess.length > 0) {
      return NextResponse.json(
        { error: `Already have active VIP (${type}) on ${server.name}` },
        { status: 400 }
      );
    }

    const checkoutSession = await createVipCheckoutSession({
      userId: user.id,
      email: user.email,
      customerId: user.stripeCustomerId,
      type,
      serverId,
      serverName: server.name,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
