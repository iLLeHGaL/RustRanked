"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Shield,
  Trophy,
  Users,
  Zap,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const FEATURES = [
  "Access to all RustRanked servers",
  "Ranked matchmaking with ELO system",
  "Verified player community (no cheaters)",
  "Discord role & server access",
  "Match history & detailed stats",
  "Leaderboard rankings",
  "Priority support",
];

export default function SubscribePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust-500" />
      </div>
    );
  }

  if (!session) {
    router.push("/login?callbackUrl=/subscribe");
    return null;
  }

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

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

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {canceled && (
          <div className="mb-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-center text-yellow-400">
            Checkout was canceled. You can try again when you're ready.
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Join RustRanked
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Get access to verified, competitive Rust gameplay with skill-based
            matchmaking and a cheat-free environment.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Pricing Card */}
          <div className="card border-rust-600/50 bg-gradient-to-b from-rust-950/20 to-transparent">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                Monthly Subscription
              </h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-white">$19</span>
                <span className="text-zinc-400">/month</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Cancel anytime. No long-term commitment.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="btn-primary w-full py-3 text-base mb-6"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Subscribe Now"
              )}
            </button>

            <ul className="space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-rust-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why Subscribe */}
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rust-600/10 flex-shrink-0">
                  <Shield className="h-5 w-5 text-rust-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">
                    No Cheaters
                  </h3>
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
                  <Trophy className="h-5 w-5 text-rust-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">
                    Skill-Based Matches
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Our ELO system ensures you play against opponents of similar
                    skill. Climb the ranks and prove yourself.
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
                  <h3 className="font-semibold text-white mb-1">
                    Active Community
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Join our Discord for team finding, tournaments, and
                    community events. Your subscription includes exclusive
                    access.
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
                  <h3 className="font-semibold text-white mb-1">
                    Premium Servers
                  </h3>
                  <p className="text-sm text-zinc-400">
                    High-performance dedicated servers with anti-cheat, low
                    ping, and 24/7 uptime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-medium text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-sm text-zinc-400">
                Yes! You can cancel your subscription at any time from your
                dashboard. You'll keep access until the end of your billing
                period.
              </p>
            </div>
            <div className="card">
              <h3 className="font-medium text-white mb-2">
                Why is ID verification required?
              </h3>
              <p className="text-sm text-zinc-400">
                ID verification ensures one account per person, preventing
                cheaters from creating new accounts after being banned.
              </p>
            </div>
            <div className="card">
              <h3 className="font-medium text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-sm text-zinc-400">
                We accept all major credit and debit cards through Stripe,
                including Visa, Mastercard, and American Express.
              </p>
            </div>
            <div className="card">
              <h3 className="font-medium text-white mb-2">
                Do I need to verify before subscribing?
              </h3>
              <p className="text-sm text-zinc-400">
                You can subscribe first and verify later, but you'll need to
                complete verification before joining servers.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
