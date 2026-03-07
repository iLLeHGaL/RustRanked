import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma, SeasonStatus } from "@rustranked/database";
import { DashboardContent } from "./dashboard-content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent user={user} />
    </Suspense>
  );
}

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="text-zinc-400">Loading...</div>
    </div>
  );
}
