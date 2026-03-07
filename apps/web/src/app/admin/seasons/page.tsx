"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Trophy,
  Plus,
  Trash2,
  Play,
  Pause,
  Calendar,
  Users,
  Layers,
  Archive,
  Gift,
} from "lucide-react";

type SeasonStatus = "UPCOMING" | "ACTIVE" | "ENDED" | "ARCHIVED";

interface Season {
  id: string;
  name: string;
  number: number;
  status: SeasonStatus;
  startsAt: string;
  endsAt: string;
  maxLevel: number;
  xpPerLevel: { baseXp: number; increase: number };
  createdAt: string;
  _count: { playerSeasons: number; tiers: number };
}

interface BattlePassTier {
  id: string;
  level: number;
  isPremium: boolean;
  rewardType: string;
  rewardAmount: number | null;
  cosmeticId: string | null;
  caseDefId: string | null;
}

const STATUS_LABELS: Record<SeasonStatus, string> = {
  UPCOMING: "Upcoming",
  ACTIVE: "Active",
  ENDED: "Ended",
  ARCHIVED: "Archived",
};

const STATUS_COLORS: Record<SeasonStatus, string> = {
  UPCOMING: "bg-blue-500/20 text-blue-400",
  ACTIVE: "bg-green-500/20 text-green-400",
  ENDED: "bg-zinc-700 text-zinc-400",
  ARCHIVED: "bg-zinc-800 text-zinc-500",
};

const REWARD_TYPES = [
  "TOKENS",
  "XP",
  "BATTLE_PASS_XP",
  "COSMETIC",
  "CASE",
  "VIP_DAYS",
  "XP_BOOST",
  "BADGE",
];

export default function AdminSeasonsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Season Form
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    number: 1,
    startsAt: "",
    endsAt: "",
    maxLevel: 50,
    baseXp: 1000,
    increase: 200,
  });

  // Tiers
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<BattlePassTier[]>([]);
  const [showTierForm, setShowTierForm] = useState(false);
  const [tierForm, setTierForm] = useState({
    level: 1,
    isPremium: false,
    rewardType: "TOKENS",
    rewardAmount: 100,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchSeasons();
    }
  }, [status, router]);

  async function fetchSeasons() {
    try {
      const res = await fetch("/api/admin/seasons");
      if (!res.ok) {
        if (res.status === 403) {
          setError("You don't have permission to access this page.");
          return;
        }
        throw new Error("Failed to fetch seasons");
      }
      const data = await res.json();
      setSeasons(data.seasons || []);
    } catch (err) {
      setError("Failed to load seasons");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTiers(seasonId: string) {
    try {
      const res = await fetch(`/api/admin/battle-pass/tiers?seasonId=${seasonId}`);
      if (res.ok) {
        const data = await res.json();
        setTiers(data.tiers || []);
      }
    } catch (err) {
      console.error("Failed to fetch tiers:", err);
    }
  }

  async function handleSeasonSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: seasonForm.name,
          number: seasonForm.number,
          startsAt: seasonForm.startsAt,
          endsAt: seasonForm.endsAt,
          maxLevel: seasonForm.maxLevel,
          xpPerLevel: { baseXp: seasonForm.baseXp, increase: seasonForm.increase },
        }),
      });

      if (res.ok) {
        setShowSeasonForm(false);
        setSeasonForm({ name: "", number: 1, startsAt: "", endsAt: "", maxLevel: 50, baseXp: 1000, increase: 200 });
        fetchSeasons();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create season");
      }
    } catch {
      alert("Failed to create season");
    }
  }

  async function handleStatusChange(id: string, newStatus: SeasonStatus) {
    const res = await fetch("/api/admin/seasons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });

    if (res.ok) {
      fetchSeasons();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to update season");
    }
  }

  async function handleDeleteSeason(id: string) {
    if (!confirm("Are you sure you want to delete this season?")) return;

    const res = await fetch(`/api/admin/seasons?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchSeasons();
      if (selectedSeasonId === id) {
        setSelectedSeasonId(null);
        setTiers([]);
      }
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete season");
    }
  }

  async function handleAddTier(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSeasonId) return;

    const newTiers = [
      ...tiers.map((t) => ({
        level: t.level,
        isPremium: t.isPremium,
        rewardType: t.rewardType,
        rewardAmount: t.rewardAmount,
      })),
      {
        level: tierForm.level,
        isPremium: tierForm.isPremium,
        rewardType: tierForm.rewardType,
        rewardAmount: tierForm.rewardAmount,
      },
    ];

    const res = await fetch("/api/admin/battle-pass/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId: selectedSeasonId, tiers: newTiers }),
    });

    if (res.ok) {
      setShowTierForm(false);
      setTierForm({ level: 1, isPremium: false, rewardType: "TOKENS", rewardAmount: 100 });
      fetchTiers(selectedSeasonId);
    }
  }

  async function handleRemoveTier(index: number) {
    if (!selectedSeasonId) return;

    const newTiers = tiers
      .filter((_, i) => i !== index)
      .map((t) => ({
        level: t.level,
        isPremium: t.isPremium,
        rewardType: t.rewardType,
        rewardAmount: t.rewardAmount,
      }));

    const res = await fetch("/api/admin/battle-pass/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId: selectedSeasonId, tiers: newTiers }),
    });

    if (res.ok) {
      fetchTiers(selectedSeasonId);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-rust-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-rust-500" />
            Season Management
          </h1>
          <p className="text-zinc-400">Create and manage battle pass seasons</p>
        </div>

        {/* Seasons Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Seasons</h2>
            <button
              onClick={() => setShowSeasonForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Season
            </button>
          </div>

          {showSeasonForm && (
            <div className="card p-4 mb-4">
              <form onSubmit={handleSeasonSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Name *</label>
                    <input
                      type="text"
                      value={seasonForm.name}
                      onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                      className="input w-full"
                      placeholder="Season 1: Origins"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Season Number *</label>
                    <input
                      type="number"
                      value={seasonForm.number}
                      onChange={(e) => setSeasonForm({ ...seasonForm, number: parseInt(e.target.value) })}
                      className="input w-full"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Starts At *</label>
                    <input
                      type="datetime-local"
                      value={seasonForm.startsAt}
                      onChange={(e) => setSeasonForm({ ...seasonForm, startsAt: e.target.value })}
                      className="input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Ends At *</label>
                    <input
                      type="datetime-local"
                      value={seasonForm.endsAt}
                      onChange={(e) => setSeasonForm({ ...seasonForm, endsAt: e.target.value })}
                      className="input w-full"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Max Level</label>
                    <input
                      type="number"
                      value={seasonForm.maxLevel}
                      onChange={(e) => setSeasonForm({ ...seasonForm, maxLevel: parseInt(e.target.value) })}
                      className="input w-full"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Base XP per Level</label>
                    <input
                      type="number"
                      value={seasonForm.baseXp}
                      onChange={(e) => setSeasonForm({ ...seasonForm, baseXp: parseInt(e.target.value) })}
                      className="input w-full"
                      min="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">XP Increase per Level</label>
                    <input
                      type="number"
                      value={seasonForm.increase}
                      onChange={(e) => setSeasonForm({ ...seasonForm, increase: parseInt(e.target.value) })}
                      className="input w-full"
                      min="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">Create Season</button>
                  <button type="button" onClick={() => setShowSeasonForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {seasons.map((season) => (
              <div
                key={season.id}
                className={`card p-4 cursor-pointer transition-colors ${
                  selectedSeasonId === season.id ? "ring-1 ring-rust-500/50" : ""
                }`}
                onClick={() => {
                  setSelectedSeasonId(season.id);
                  fetchTiers(season.id);
                }}
              >
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[season.status]}`}>
                        {STATUS_LABELS[season.status]}
                      </span>
                      <span className="text-white font-medium">
                        Season {season.number}: {season.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(season.startsAt).toLocaleDateString()} - {new Date(season.endsAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {season._count.playerSeasons} players
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-4 w-4" />
                        {season._count.tiers} tiers
                      </span>
                      <span className="text-zinc-500">
                        Max Lv.{season.maxLevel}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {season.status === "UPCOMING" && (
                      <button
                        onClick={() => handleStatusChange(season.id, "ACTIVE")}
                        className="p-2 text-green-400 hover:bg-green-400/10 rounded"
                        title="Start Season"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {season.status === "ACTIVE" && (
                      <button
                        onClick={() => handleStatusChange(season.id, "ENDED")}
                        className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded"
                        title="End Season"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    )}
                    {season.status === "ENDED" && (
                      <button
                        onClick={() => handleStatusChange(season.id, "ARCHIVED")}
                        className="p-2 text-zinc-400 hover:bg-zinc-400/10 rounded"
                        title="Archive Season"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                    {season.status === "UPCOMING" && (
                      <button
                        onClick={() => handleDeleteSeason(season.id)}
                        className="p-2 text-zinc-400 hover:text-red-400 rounded"
                        title="Delete Season"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {seasons.length === 0 && (
              <p className="text-zinc-500">No seasons yet. Create your first season to get started.</p>
            )}
          </div>
        </section>

        {/* Battle Pass Tiers Section */}
        {selectedSeasonId && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Gift className="h-5 w-5 text-rust-500" />
                Battle Pass Tiers
                <span className="text-sm font-normal text-zinc-500">
                  (Season {seasons.find((s) => s.id === selectedSeasonId)?.number})
                </span>
              </h2>
              <button
                onClick={() => setShowTierForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Tier
              </button>
            </div>

            {showTierForm && (
              <div className="card p-4 mb-4">
                <form onSubmit={handleAddTier} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Level *</label>
                      <input
                        type="number"
                        value={tierForm.level}
                        onChange={(e) => setTierForm({ ...tierForm, level: parseInt(e.target.value) })}
                        className="input w-full"
                        min="1"
                        max="100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Reward Type *</label>
                      <select
                        value={tierForm.rewardType}
                        onChange={(e) => setTierForm({ ...tierForm, rewardType: e.target.value })}
                        className="input w-full"
                      >
                        {REWARD_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Amount</label>
                      <input
                        type="number"
                        value={tierForm.rewardAmount}
                        onChange={(e) => setTierForm({ ...tierForm, rewardAmount: parseInt(e.target.value) })}
                        className="input w-full"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Tier</label>
                      <label className="flex items-center gap-2 h-11 px-4 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tierForm.isPremium}
                          onChange={(e) => setTierForm({ ...tierForm, isPremium: e.target.checked })}
                          className="rounded border-zinc-600"
                        />
                        <span className="text-sm text-zinc-300">Premium</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary">Add Tier</button>
                    <button type="button" onClick={() => setShowTierForm(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {tiers.length > 0 ? (
              <div className="card p-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-xs text-zinc-500 uppercase px-4 py-3">Level</th>
                      <th className="text-left text-xs text-zinc-500 uppercase px-4 py-3">Tier</th>
                      <th className="text-left text-xs text-zinc-500 uppercase px-4 py-3">Reward Type</th>
                      <th className="text-left text-xs text-zinc-500 uppercase px-4 py-3">Amount</th>
                      <th className="text-right text-xs text-zinc-500 uppercase px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier, index) => (
                      <tr key={tier.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-sm text-white font-mono">{tier.level}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            tier.isPremium
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-zinc-700 text-zinc-400"
                          }`}>
                            {tier.isPremium ? "Premium" : "Free"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">{tier.rewardType}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{tier.rewardAmount ?? "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveTier(index)}
                            className="p-1 text-zinc-400 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-zinc-500">No tiers configured. Add rewards to the battle pass.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
