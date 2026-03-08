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
    const { type } = body as { type?: string };

    if (type !== "monthly" && type !== "wipe") {
      return NextResponse.json(
        { error: "Invalid VIP type. Must be 'monthly' or 'wipe'" },
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
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has active VIP of same type
    if (user.vipAccess.length > 0) {
      return NextResponse.json(
        { error: `Already have active VIP (${type})` },
        { status: 400 }
      );
    }

    const checkoutSession = await createVipCheckoutSession({
      userId: user.id,
      email: user.email,
      customerId: user.stripeCustomerId,
      type,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
