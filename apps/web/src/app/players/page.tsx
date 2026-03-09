import { Navbar } from "@/components/navbar";
import { PlayerSearch } from "@/components/player-search";

export const metadata = {
  title: "Players - RustRanked",
};

export default function PlayersPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Find Players</h1>
          <p className="mt-2 text-zinc-400">Search by Steam name, Discord name, or Steam ID</p>
        </div>
        <PlayerSearch variant="full" />
      </main>
    </div>
  );
}
