import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createIdentityVerificationSession } from "@/lib/stripe";
import { prisma, VerificationStatus } from "@rustranked/database";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already verified
    if (user.verificationStatus === VerificationStatus.VERIFIED) {
      return NextResponse.json(
        { error: "Already verified" },
        { status: 400 }
      );
    }

    // Check if verification is pending
    if (user.verificationStatus === VerificationStatus.PENDING) {
      return NextResponse.json(
        { error: "Verification already in progress" },
        { status: 400 }
      );
    }

    const verificationSession = await createIdentityVerificationSession({
      userId: user.id,
      customerId: user.stripeCustomerId,
    });

    // Update user status to pending
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        verificationId: verificationSession.id,
      },
    });

    return NextResponse.json({ url: verificationSession.url });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Failed to create verification session" },
      { status: 500 }
    );
  }
}
