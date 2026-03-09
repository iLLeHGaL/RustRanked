import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@rustranked/database";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { steamId: true },
  });

  if (!user) {
    redirect("/login");
  }

  // If user has Steam linked, redirect to their profile
  if (user.steamId) {
    redirect(`/profile/${user.steamId}`);
  }

  // Otherwise show minimal setup page
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to RustRanked</h1>
          <p className="text-zinc-400 mb-6">
            Link your Steam account to access your profile, view stats, and connect with other players.
          </p>
          <Link href="/api/steam/link" className="btn-primary">
            Link Steam Account
          </Link>
        </div>
      </main>
    </div>
  );
}
