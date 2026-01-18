"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Camera,
  Lock,
} from "lucide-react";

export default function VerifyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
    router.push("/login?callbackUrl=/verify");
    return null;
  }

  const verificationStatus = session.user.verificationStatus;

  const handleStartVerification = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/verify", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start verification");
      }

      // Redirect to Stripe Identity
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
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rust-600/10">
            <Shield className="h-8 w-8 text-rust-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Identity Verification
          </h1>
          <p className="text-zinc-400 max-w-md mx-auto">
            Verify your identity to access RustRanked servers. This ensures a
            fair, cheat-free environment for all players.
          </p>
        </div>

        {/* Status Display */}
        {verificationStatus === "VERIFIED" && (
          <div className="card bg-green-500/5 border-green-500/20 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  You're Verified!
                </h3>
                <p className="text-sm text-zinc-400">
                  Your identity has been verified. You can now access all
                  RustRanked servers.
                </p>
              </div>
            </div>
            <Link href="/dashboard" className="btn-primary w-full mt-6">
              Return to Dashboard
            </Link>
          </div>
        )}

        {verificationStatus === "PENDING" && (
          <div className="card bg-yellow-500/5 border-yellow-500/20 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  Verification In Progress
                </h3>
                <p className="text-sm text-zinc-400">
                  Your verification is being processed. This usually takes a few
                  minutes.
                </p>
              </div>
            </div>
            <Link href="/dashboard" className="btn-secondary w-full mt-6">
              Return to Dashboard
            </Link>
          </div>
        )}

        {verificationStatus === "REJECTED" && (
          <div className="card bg-red-500/5 border-red-500/20 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  Verification Failed
                </h3>
                <p className="text-sm text-zinc-400">
                  Your verification could not be completed. Please try again
                  with a valid government ID.
                </p>
              </div>
            </div>
            <button
              onClick={handleStartVerification}
              disabled={loading}
              className="btn-primary w-full mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                "Try Again"
              )}
            </button>
          </div>
        )}

        {verificationStatus === "UNVERIFIED" && (
          <>
            {/* Verification Card */}
            <div className="card mb-8">
              {error && (
                <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <h2 className="text-lg font-semibold text-white mb-4">
                What You'll Need
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-rust-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Government-Issued ID
                    </p>
                    <p className="text-xs text-zinc-500">
                      Passport, driver's license, or national ID card
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Camera className="h-5 w-5 text-rust-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Selfie Photo
                    </p>
                    <p className="text-xs text-zinc-500">
                      A live photo to match with your ID
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-rust-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Secure & Private
                    </p>
                    <p className="text-xs text-zinc-500">
                      Processed by Stripe. We never see your ID details.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartVerification}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting Verification...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Start Verification
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-xs text-zinc-500">
                Verification typically takes 1-2 minutes
              </p>
            </div>

            {/* Why Verify */}
            <div className="card bg-zinc-900/30">
              <h3 className="font-medium text-white mb-3">
                Why do we require verification?
              </h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-rust-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Prevents cheaters from creating new accounts after bans
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-rust-500 flex-shrink-0 mt-0.5" />
                  <span>Ensures one account per person (no smurfs)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-rust-500 flex-shrink-0 mt-0.5" />
                  <span>Creates accountability in the community</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-rust-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Your data is processed securely by Stripe and never stored
                    by us
                  </span>
                </li>
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
