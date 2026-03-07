import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, RewardType } from "@rustranked/database";

const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",") || [];

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return false;
  return ADMIN_DISCORD_IDS.includes(session.user.discordId);
}

// GET - List tiers for a season
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");

  if (!seasonId) {
    return NextResponse.json(
      { error: "seasonId is required" },
      { status: 400 }
    );
  }

  const tiers = await prisma.battlePassTier.findMany({
    where: { seasonId },
    orderBy: [{ level: "asc" }, { isPremium: "asc" }],
  });

  return NextResponse.json({ tiers });
}

// POST - Bulk create/update battle pass tiers for a season
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { seasonId, tiers } = body;

    if (!seasonId || !Array.isArray(tiers)) {
      return NextResponse.json(
        { error: "seasonId and tiers array are required" },
        { status: 400 }
      );
    }

    // Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });
    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    // Validate tier data
    const validRewardTypes = Object.values(RewardType);
    for (const tier of tiers) {
      if (typeof tier.level !== "number" || tier.level < 1) {
        return NextResponse.json(
          { error: `Invalid level: ${tier.level}` },
          { status: 400 }
        );
      }
      if (!validRewardTypes.includes(tier.rewardType)) {
        return NextResponse.json(
          { error: `Invalid rewardType: ${tier.rewardType}` },
          { status: 400 }
        );
      }
    }

    // Delete existing tiers and recreate
    await prisma.$transaction([
      prisma.battlePassTier.deleteMany({ where: { seasonId } }),
      ...tiers.map(
        (tier: {
          level: number;
          isPremium?: boolean;
          rewardType: RewardType;
          rewardAmount?: number;
          cosmeticId?: string;
          caseDefId?: string;
        }) =>
          prisma.battlePassTier.create({
            data: {
              seasonId,
              level: tier.level,
              isPremium: tier.isPremium ?? false,
              rewardType: tier.rewardType,
              rewardAmount: tier.rewardAmount ?? null,
              cosmeticId: tier.cosmeticId ?? null,
              caseDefId: tier.caseDefId ?? null,
            },
          })
      ),
    ]);

    const created = await prisma.battlePassTier.findMany({
      where: { seasonId },
      orderBy: [{ level: "asc" }, { isPremium: "asc" }],
    });

    return NextResponse.json({
      success: true,
      count: created.length,
      tiers: created,
    });
  } catch (error) {
    console.error("Update battle pass tiers error:", error);
    return NextResponse.json(
      { error: "Failed to update tiers" },
      { status: 500 }
    );
  }
}
