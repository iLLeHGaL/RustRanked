import { prisma } from "@rustranked/database";
import { LeaderboardContent } from "./leaderboard-content";

export const revalidate = 60;

export interface ServerInfo {
  slug: string;
  name: string;
  region: string;
}

export interface RegionGroup {
  region: string;
  servers: ServerInfo[];
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    server?: string;
    category?: string;
    sort?: string;
    order?: string;
    wipe?: string;
  }>;
}) {
  const params = await searchParams;

  // Fetch public servers grouped by region
  const servers = await prisma.gameServer.findMany({
    where: { isActive: true, isPublic: true },
    select: { slug: true, name: true, region: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  // Group by region preserving display order
  const regionMap = new Map<string, ServerInfo[]>();
  for (const s of servers) {
    const list = regionMap.get(s.region) || [];
    list.push({ slug: s.slug, name: s.name, region: s.region });
    regionMap.set(s.region, list);
  }

  const regionGroups: RegionGroup[] = Array.from(regionMap.entries()).map(
    ([region, servers]) => ({ region, servers })
  );

  return (
    <LeaderboardContent
      regionGroups={regionGroups}
      initialServer={params.server}
      initialCategory={params.category}
      initialSort={params.sort}
      initialOrder={params.order}
      initialWipe={params.wipe}
    />
  );
}
