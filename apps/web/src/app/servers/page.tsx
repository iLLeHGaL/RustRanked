import { prisma } from "@rustranked/database";
import { Navbar } from "@/components/navbar";
import { ServersContent } from "./servers-content";

export const dynamic = "force-dynamic";

export default async function ServersPage() {
  const servers = await prisma.gameServer.findMany({
    where: {
      isActive: true,
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      region: true,
      category: true,
      teamLimit: true,
      wipeSchedule: true,
      mapSize: true,
      maxPlayers: true,
      displayOrder: true,
      connectUrl: true,
    },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">Servers</h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            All RustRanked servers are free to play with ID-verified, cheat-free gameplay.
            Get VIP for queue priority on any server.
          </p>
        </div>
        <ServersContent servers={servers} />
      </main>
    </div>
  );
}
