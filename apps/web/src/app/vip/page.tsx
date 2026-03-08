"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Shield,
  ShieldCheck,
  Users,
  Zap,
  ArrowLeft,
  Loader2,
  Crown,
  ChevronDown,
  Server,
} from "lucide-react";

interface GameServer {
  id: string;
  name: string;
  slug: string;
  region: string;
  category: string;
}

const VIP_FEATURES = [
  "Skip the queue on this server",
  "Support RustRanked development",
];

const FREE_FEATURES = [
  "Access to all RustRanked servers",
  "Cheat-free, ID-verified community",
  "Active server administration",
  "Discord role & server access",
  "Per-wipe stats & leaderboard",
  "Full Battle Pass access",
];

export default function VipPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust-500" />
      </div>
    }>
      <VipContent />
    </Suspense>
  );
}

function VipContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  const serverSlug = searchParams.get("server");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<GameServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [serversLoading, setServersLoading] = useState(true);

  useEffect(() => {
    async function fetchServers() {
      try {
        const res = await fetch("/api/servers");
        const data = await res.json();
        setServers(data.servers || []);

        // Pre-select server from query param
        if (serverSlug && data.servers) {
          const match = data.servers.find(
            (s: GameServer) => s.slug === serverSlug
          );
          if (match) setSelectedServerId(match.id);
        }
      } catch {
        console.error("Failed to fetch servers");
      } finally {
        setServersLoading(false);
      }
    }
    fetchServers();
  }, [serverSlug]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust-500" />
      </div>
    );
  }

  if (!session) {
    router.push("/login?callbackUrl=/vip");
    return null;
  }

  const selectedServer = servers.find((s) => s.id === selectedServerId);

  const handleCheckout = async (type: "monthly" | "wipe") => {
    if (!selectedServerId) {
      setError("Please select a server first");
      return;
    }

    setLoading(type);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, serverId: selectedServerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  };

  // Group servers by region for the dropdown
  const groupedServers = servers.reduce(
    (acc, s) => {
      if (!acc[s.region]) acc[s.region] = [];
      acc[s.region].push(s);
      return acc;
    },
    {} as Record<string, GameServer[]>
  );

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        {canceled && (
          <div className="mb-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-center text-yellow-400">
            Checkout was canceled. You can try again when you&apos;re ready.
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center text-red-400">
            {error}
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            RustRanked is Free to Play
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Everyone gets full access to verified, cheat-free Rust gameplay.
            VIP is optional and gives you queue priority on a specific server.
          </p>
        </div>

        {/* Free Features */}
        <div className="card mb-8 border-green-500/20 bg-green-500/5">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-400" />
            Free for Everyone
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {FREE_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Server Selection */}
        <div className="card mb-8 border-rust-600/30">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-rust-500" />
            Select Server
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            VIP is per-server. Choose which server you want queue priority on.
          </p>

          {serversLoading ? (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading servers...
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 pr-10 text-white focus:border-rust-500 focus:outline-none focus:ring-1 focus:ring-rust-500"
              >
                <option value="">Choose a server...</option>
                {Object.entries(groupedServers).map(([region, regionServers]) => (
                  <optgroup key={region} label={region}>
                    {regionServers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>
          )}

          {selectedServer && (
            <p className="mt-3 text-sm text-zinc-400">
              VIP for <span className="text-white font-medium">{selectedServer.name}</span> ({selectedServer.region})
            </p>
          )}

          <p className="mt-3 text-xs text-zinc-500">
            Want VIP on multiple servers?{" "}
            <Link href="/servers" className="text-rust-500 hover:text-rust-400">
              View all servers
            </Link>{" "}
            and purchase VIP for each one separately.
          </p>
        </div>

        {/* VIP Pricing Cards */}
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          <Crown className="h-6 w-6 text-amber-400 inline-block mr-2 -mt-1" />
          Optional VIP
        </h2>

        <div className="grid gap-6 md:grid-cols-2 mb-12">
          {/* VIP Wipe */}
          <div className="card border-zinc-700 hover:border-rust-600/50 transition-colors">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                VIP Wipe
              </h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-white">$5</span>
                <span className="text-zinc-400">/wipe</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                One-time payment. Lasts until wipe ends.
              </p>
            </div>

            <ul className="space-y-3 mb-6">
              {VIP_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-rust-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("wipe")}
              disabled={loading !== null || !selectedServerId}
              className="btn-secondary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "wipe" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Get VIP Wipe"
              )}
            </button>
          </div>

          {/* VIP Monthly */}
          <div className="card border-rust-600/50 bg-gradient-to-b from-rust-950/20 to-transparent">
            <div className="text-center mb-6">
              <div className="inline-block px-3 py-1 rounded-full bg-rust-600/20 text-rust-400 text-xs font-medium mb-3">
                Best Value
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                VIP Monthly
              </h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-white">$10</span>
                <span className="text-zinc-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Auto-renews. Queue skip every wipe.
              </p>
            </div>

            <ul className="space-y-3 mb-6">
              {VIP_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-rust-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </li>
              ))}
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-rust-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-300">Never miss a wipe day queue</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout("monthly")}
              disabled={loading !== null || !selectedServerId}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "monthly" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Get VIP Monthly"
              )}
            </button>
          </div>
        </div>

        {/* Why RustRanked */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rust-600/10 flex-shrink-0">
                <Shield className="h-5 w-5 text-rust-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">No Cheaters</h3>
                <p className="text-sm text-zinc-400">
                  Every player is verified with government ID. One account per
                  person means no smurfs or ban evaders.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rust-600/10 flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-rust-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Active Moderation</h3>
                <p className="text-sm text-zinc-400">
                  Dedicated admins actively monitor servers and respond to
                  reports. Cheaters are removed swiftly.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rust-600/10 flex-shrink-0">
                <Users className="h-5 w-5 text-rust-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Active Community</h3>
                <p className="text-sm text-zinc-400">
                  Join our Discord for team finding, tournaments, and community
                  events. Free for everyone.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rust-600/10 flex-shrink-0">
                <Zap className="h-5 w-5 text-rust-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Premium Servers</h3>
                <p className="text-sm text-zinc-400">
                  High-performance dedicated servers with anti-cheat, low ping,
                  and 24/7 uptime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-medium text-white mb-2">
                What does VIP include?
              </h3>
              <p className="text-sm text-zinc-400">
                VIP gives you queue priority on a specific server so you can skip
                the line on wipe day. All gameplay features are free for everyone.
              </p>
            </div>
            <div className="card">
              <h3 className="font-medium text-white mb-2">
                Is VIP per-server?
              </h3>
              <p className="text-sm text-zinc-400">
                Yes, VIP is purchased per-server. If you play on multiple servers,
                you can get VIP on each one separately.
              </p>
            </div>
            <div className="card">
              <h3 className="font-medium text-white mb-2">
                What&apos;s the difference between Wipe and Monthly?
              </h3>
              <p className="text-sm text-zinc-400">
                Wipe VIP lasts until the next wipe (~35 days). Monthly VIP
                auto-renews so you always have queue skip.
              </p>
            </div>
            <div className="card">
              <h3 className="font-medium text-white mb-2">
                Can I cancel VIP Monthly anytime?
              </h3>
              <p className="text-sm text-zinc-400">
                Yes! Cancel anytime from your billing page. You&apos;ll keep VIP
                until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
