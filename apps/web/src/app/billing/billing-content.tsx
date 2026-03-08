"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  type Subscription,
  type VipAccess,
} from "@rustranked/database";
import {
  ArrowLeft,
  Crown,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

type UserWithBilling = User & {
  subscription: Subscription | null;
  vipAccess: VipAccess[];
};

export function BillingContent({ user }: { user: UserWithBilling }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeVip = user.vipAccess[0] ?? null;
  const hasVip = !!activeVip;

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

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

      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Billing & VIP
          </h1>
          <p className="text-zinc-400">
            Manage your VIP status and payment methods
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* VIP Status */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              VIP Status
            </h2>
            {hasVip && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                <Crown className="h-3.5 w-3.5" />
                Active
              </span>
            )}
            {!hasVip && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400">
                No VIP
              </span>
            )}
          </div>

          {hasVip && activeVip ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Crown className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400">Plan:</span>
                <span className="text-white">
                  VIP {activeVip.type === "MONTHLY" ? "Monthly" : "Wipe"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400">
                  {activeVip.type === "MONTHLY" && activeVip.cancelAtPeriodEnd
                    ? "Access until:"
                    : activeVip.type === "MONTHLY"
                      ? "Next billing date:"
                      : "Expires:"}
                </span>
                <span className="text-white">
                  {new Date(activeVip.expiresAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {activeVip.type === "MONTHLY" && activeVip.cancelAtPeriodEnd && (
                <div className="mt-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <p className="text-sm text-yellow-400">
                    Your VIP is set to cancel at the end of the current billing
                    period. You&apos;ll retain VIP access until then.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-zinc-400 mb-2">
                VIP is optional &mdash; RustRanked is free to play!
              </p>
              <p className="text-zinc-500 text-sm mb-4">
                VIP gives you queue priority on all servers.
              </p>
              <Link href="/vip" className="btn-primary">
                Get VIP
              </Link>
            </div>
          )}
        </div>

        {/* Manage Billing */}
        {user.stripeCustomerId && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-2">
              Payment Settings
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Update payment method, view invoices, or manage your VIP
            </p>
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="btn-secondary"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  Manage Billing
                  <ExternalLink className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            Having issues with billing?{" "}
            <Link href="/support" className="text-rust-500 hover:text-rust-400">
              Contact Support
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
