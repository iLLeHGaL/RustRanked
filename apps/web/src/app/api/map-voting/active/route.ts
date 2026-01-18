import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";

// Server types - matches Prisma enum
const ServerType = {
  US_MAIN: "US_MAIN",
  US_MONDAYS: "US_MONDAYS",
  EU_MAIN: "EU_MAIN",
  EU_MONDAYS: "EU_MONDAYS",
} as const;

type ServerTypeValue = (typeof ServerType)[keyof typeof ServerType];

// GET - Get active voting periods (with vote counts)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const { searchParams } = new URL(request.url);
  const serverType = searchParams.get("serverType") as ServerType | null;

  const now = new Date();

  // Build query
  const where: Record<string, unknown> = {
    isActive: true,
    startsAt: { lte: now },
    endsAt: { gte: now },
  };

  if (serverType && Object.values(ServerType).includes(serverType)) {
    where.serverType = serverType;
  }

  const votingPeriods = await prisma.votingPeriod.findMany({
    where,
    include: {
      mapOptions: {
        include: {
          mapOption: {
            include: {
              votes: {
                where: {
                  votingPeriod: {
                    id: { not: undefined },
                  },
                },
                select: {
                  votingPeriodId: true,
                },
              },
            },
          },
        },
      },
      votes: {
        select: {
          userId: true,
          mapOptionId: true,
        },
      },
    },
    orderBy: { endsAt: "asc" },
  });

  // Transform data to include vote counts and user's vote
  const transformedPeriods = votingPeriods.map((period) => {
    // Count votes per map for this period
    const voteCountsMap: Record<string, number> = {};
    period.votes.forEach((vote) => {
      voteCountsMap[vote.mapOptionId] = (voteCountsMap[vote.mapOptionId] || 0) + 1;
    });

    const totalVotes = period.votes.length;
    const userVote = userId
      ? period.votes.find((v) => v.userId === userId)?.mapOptionId
      : null;

    return {
      id: period.id,
      serverType: period.serverType,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      wipeDate: period.wipeDate,
      totalVotes,
      userVote,
      mapOptions: period.mapOptions.map((pm) => ({
        id: pm.mapOption.id,
        name: pm.mapOption.name,
        description: pm.mapOption.description,
        imageUrl: pm.mapOption.imageUrl,
        votes: voteCountsMap[pm.mapOption.id] || 0,
        percentage: totalVotes > 0
          ? Math.round(((voteCountsMap[pm.mapOption.id] || 0) / totalVotes) * 100)
          : 0,
      })),
    };
  });

  return NextResponse.json({ votingPeriods: transformedPeriods });
}
