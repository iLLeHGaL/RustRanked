"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";

// This file is kept as a minimal fallback. The main dashboard redirects
// to /profile/[steamId] for users who have Steam linked.

export function DashboardContent() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to RustRanked</h1>
          <p className="text-zinc-400 mb-6">
            Link your Steam account to access your profile.
          </p>
          <Link href="/api/steam/link" className="btn-primary">
            Link Steam Account
          </Link>
        </div>
      </main>
    </div>
  );
}
