import { NextResponse } from "next/server";
import { prisma, SeasonStatus } from "@rustranked/database";

// GET - Return the currently active season with tier rewards preview
export async function GET() {
  try {
    const season = await prisma.season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
      include: {
        tiers: {
          orderBy: [{ level: "asc" }, { isPremium: "asc" }],
        },
      },
    });

    if (!season) {
      return NextResponse.json({ season: null });
    }

    return NextResponse.json({
      season: {
        id: season.id,
        name: season.name,
        number: season.number,
        status: season.status,
        startsAt: season.startsAt.toISOString(),
        endsAt: season.endsAt.toISOString(),
        maxLevel: season.maxLevel,
        xpPerLevel: season.xpPerLevel,
        tiers: season.tiers.map((tier) => ({
          id: tier.id,
          level: tier.level,
          isPremium: tier.isPremium,
          rewardType: tier.rewardType,
          rewardAmount: tier.rewardAmount,
          cosmeticId: tier.cosmeticId,
          caseDefId: tier.caseDefId,
        })),
      },
    });
  } catch (error) {
    console.error("Get current season error:", error);
    return NextResponse.json(
      { error: "Failed to get current season" },
      { status: 500 }
    );
  }
}
