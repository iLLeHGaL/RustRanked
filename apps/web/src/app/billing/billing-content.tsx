"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  type Subscription,
  SubscriptionStatus,
} from "@rustranked/database";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

type UserWithSubscription = User & {
  subscription: Subscription | null;
};

export function BillingContent({ user }: { user: UserWithSubscription }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscription = user.subscription;
  const isActive = subscription?.status === SubscriptionStatus.ACTIVE;
  const isPastDue = subscription?.status === SubscriptionStatus.PAST_DUE;

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
            Billing & Subscription
          </h1>
          <p className="text-zinc-400">
            Manage your subscription and payment methods
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Subscription Status */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Subscription Status
            </h2>
            {isActive && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                <CheckCircle className="h-3.5 w-3.5" />
                Active
              </span>
            )}
            {isPastDue && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Past Due
              </span>
            )}
            {!subscription && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400">
                No Subscription
              </span>
            )}
          </div>

          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400">Plan:</span>
                <span className="text-white">Monthly Subscription</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400">
                  {subscription.cancelAtPeriodEnd
                    ? "Access until:"
                    : "Next billing date:"}
                </span>
                <span className="text-white">
                  {new Date(
                    subscription.currentPeriodEnd
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {subscription.cancelAtPeriodEnd && (
                <div className="mt-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <p className="text-sm text-yellow-400">
                    Your subscription is set to cancel at the end of the current
                    billing period. You'll retain access until then.
                  </p>
                </div>
              )}

              {isPastDue && (
                <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-400">
                    Your payment is past due. Please update your payment method
                    to maintain access.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-zinc-400 mb-4">
                You don't have an active subscription
              </p>
              <Link href="/subscribe" className="btn-primary">
                Subscribe Now
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
              Update payment method, view invoices, or cancel your subscription
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
