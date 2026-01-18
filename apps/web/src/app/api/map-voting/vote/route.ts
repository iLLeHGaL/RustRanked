import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

// POST - Submit a vote
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { votingPeriodId, mapOptionId } = body;

    if (!votingPeriodId || !mapOptionId) {
      return NextResponse.json(
        { error: "votingPeriodId and mapOptionId are required" },
        { status: 400 }
      );
    }

    // Verify voting period exists and is active
    const now = new Date();
    const votingPeriod = await prisma.votingPeriod.findFirst({
      where: {
        id: votingPeriodId,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        mapOptions: true,
      },
    });

    if (!votingPeriod) {
      return NextResponse.json(
        { error: "Voting period not found or not active" },
        { status: 404 }
      );
    }

    // Verify map option is part of this voting period
    const mapOptionInPeriod = votingPeriod.mapOptions.some(
      (pm) => pm.mapOptionId === mapOptionId
    );

    if (!mapOptionInPeriod) {
      return NextResponse.json(
        { error: "Map option not available for this voting period" },
        { status: 400 }
      );
    }

    // Check if user already voted (upsert to allow changing vote)
    const vote = await prisma.vote.upsert({
      where: {
        userId_votingPeriodId: {
          userId: session.user.id,
          votingPeriodId,
        },
      },
      update: {
        mapOptionId,
      },
      create: {
        userId: session.user.id,
        votingPeriodId,
        mapOptionId,
      },
    });

    return NextResponse.json({ vote, message: "Vote submitted successfully" });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Failed to submit vote" },
      { status: 500 }
    );
  }
}
