"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./user-menu";

export function Navbar() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isLoggedIn = !!session;

  return (
    <nav className="border-b border-zinc-800 bg-dark-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rust-600">
            <span className="text-lg font-bold text-white">R</span>
          </div>
          <span className="text-xl font-bold text-white">RustRanked</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/leaderboard"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Leaderboard
          </Link>

          {isLoading ? (
            <div className="h-9 w-9 bg-zinc-800 rounded-full animate-pulse" />
          ) : isLoggedIn ? (
            <UserMenu user={session.user} />
          ) : (
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export function HeroButtons() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isLoggedIn = !!session;

  if (isLoading) {
    return (
      <div className="mt-10 flex items-center justify-center gap-4">
        <div className="h-12 w-36 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-12 w-36 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mt-10 flex items-center justify-center gap-4">
      {isLoggedIn ? (
        <>
          <Link href="/dashboard" className="btn-primary text-base px-8 py-3">
            Go to Dashboard
          </Link>
          <Link href="/leaderboard" className="btn-secondary text-base px-8 py-3">
            View Leaderboard
          </Link>
        </>
      ) : (
        <>
          <Link href="/login" className="btn-primary text-base px-8 py-3">
            Get Started
          </Link>
          <Link href="/leaderboard" className="btn-secondary text-base px-8 py-3">
            View Leaderboard
          </Link>
        </>
      )}
    </div>
  );
}
