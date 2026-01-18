"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/navbar";
import { Map, Check, Clock, Vote } from "lucide-react";
import Image from "next/image";

type ServerType = "US_MAIN" | "US_MONDAYS" | "EU_MAIN" | "EU_MONDAYS";

interface MapOption {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  votes: number;
  percentage: number;
}

interface VotingPeriod {
  id: string;
  serverType: ServerType;
  startsAt: string;
  endsAt: string;
  wipeDate: string | null;
  totalVotes: number;
  userVote: string | null;
  mapOptions: MapOption[];
}

const SERVER_LABELS: Record<ServerType, string> = {
  US_MAIN: "US Main",
  US_MONDAYS: "US Mondays",
  EU_MAIN: "EU Main",
  EU_MONDAYS: "EU Mondays",
};

const SERVERS: ServerType[] = ["US_MAIN", "US_MONDAYS", "EU_MAIN", "EU_MONDAYS"];

export default function MapVotingPage() {
  const { data: session, status } = useSession();
  const [selectedServer, setSelectedServer] = useState<ServerType>("US_MAIN");
  const [votingPeriods, setVotingPeriods] = useState<VotingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    fetchVotingPeriods();
  }, []);

  async function fetchVotingPeriods() {
    try {
      const res = await fetch("/api/map-voting/active");
      const data = await res.json();
      setVotingPeriods(data.votingPeriods || []);
    } catch (error) {
      console.error("Failed to fetch voting periods:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(votingPeriodId: string, mapOptionId: string) {
    if (!session) return;

    setVoting(mapOptionId);
    try {
      const res = await fetch("/api/map-voting/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votingPeriodId, mapOptionId }),
      });

      if (res.ok) {
        await fetchVotingPeriods();
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    } finally {
      setVoting(null);
    }
  }

  const currentPeriod = votingPeriods.find(
    (p) => p.serverType === selectedServer
  );

  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Map className="h-8 w-8 text-rust-500" />
            Map Voting
          </h1>
          <p className="text-zinc-400">
            Vote for the map you want to play on the next wipe
          </p>
        </div>

        {/* Server Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {SERVERS.map((server) => {
            const hasActiveVoting = votingPeriods.some(
              (p) => p.serverType === server
            );
            return (
              <button
                key={server}
                onClick={() => setSelectedServer(server)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  selectedServer === server
                    ? "bg-rust-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {SERVER_LABELS[server]}
                {hasActiveVoting && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="card p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-rust-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-zinc-400">Loading voting periods...</p>
          </div>
        ) : !currentPeriod ? (
          <div className="card p-12 text-center">
            <Vote className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No Active Voting
            </h2>
            <p className="text-zinc-400">
              There&apos;s no active map voting for {SERVER_LABELS[selectedServer]} right now.
              Check back later!
            </p>
          </div>
        ) : (
          <div>
            {/* Voting Period Info */}
            <div className="card p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Voting ends</p>
                    <p className="text-white font-medium">
                      {new Date(currentPeriod.endsAt).toLocaleDateString()} at{" "}
                      {new Date(currentPeriod.endsAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {currentPeriod.wipeDate && (
                  <div>
                    <p className="text-sm text-zinc-400">Wipe date</p>
                    <p className="text-white font-medium">
                      {new Date(currentPeriod.wipeDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-zinc-400">Total votes</p>
                  <p className="text-white font-medium">{currentPeriod.totalVotes}</p>
                </div>
              </div>
            </div>

            {/* Map Options */}
            <div className="grid gap-4 sm:grid-cols-2">
              {currentPeriod.mapOptions.map((mapOption) => {
                const isUserVote = currentPeriod.userVote === mapOption.id;
                const isVoting = voting === mapOption.id;

                return (
                  <div
                    key={mapOption.id}
                    className={`card overflow-hidden ${
                      isUserVote ? "ring-2 ring-rust-500" : ""
                    }`}
                  >
                    {mapOption.imageUrl && (
                      <div className="relative h-32 bg-zinc-800">
                        <Image
                          src={mapOption.imageUrl}
                          alt={mapOption.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white flex items-center gap-2">
                            {mapOption.name}
                            {isUserVote && (
                              <span className="text-xs bg-rust-600 text-white px-2 py-0.5 rounded-full">
                                Your vote
                              </span>
                            )}
                          </h3>
                          {mapOption.description && (
                            <p className="text-sm text-zinc-400 mt-1">
                              {mapOption.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Vote Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-400">
                            {mapOption.votes} votes
                          </span>
                          <span className="text-white font-medium">
                            {mapOption.percentage}%
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rust-500 transition-all duration-300"
                            style={{ width: `${mapOption.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Vote Button */}
                      {isAuthenticated ? (
                        <button
                          onClick={() => handleVote(currentPeriod.id, mapOption.id)}
                          disabled={isVoting || isUserVote}
                          className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            isUserVote
                              ? "bg-rust-600/20 text-rust-400 cursor-default"
                              : "bg-rust-600 text-white hover:bg-rust-500 disabled:opacity-50"
                          }`}
                        >
                          {isVoting ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : isUserVote ? (
                            <>
                              <Check className="h-4 w-4" />
                              Voted
                            </>
                          ) : (
                            "Vote for this map"
                          )}
                        </button>
                      ) : (
                        <p className="text-center text-sm text-zinc-500">
                          Sign in to vote
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
