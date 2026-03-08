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
      ip: true,
      port: true,
    },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative text-center mb-12">
          {/* Gradient glow */}
          <div className="absolute inset-0 -top-12 flex justify-center pointer-events-none" aria-hidden="true">
            <div className="w-80 h-40 bg-rust-600/10 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h1 className="text-4xl font-bold text-white mb-4">Servers</h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-4">
              All RustRanked servers are free to play with ID-verified, cheat-free gameplay.
              Get VIP for queue priority on any server.
            </p>
            <p className="text-sm text-zinc-500 max-w-lg mx-auto">
              Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono">F1</kbd> in Rust to open the console, then paste the connect command from any server card below.
            </p>
          </div>
        </div>
        <ServersContent servers={servers} />
      </main>
    </div>
  );
}
