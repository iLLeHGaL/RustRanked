"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Map,
  Plus,
  Trash2,
  Edit2,
  Play,
  Pause,
  Calendar,
  Image as ImageIcon,
} from "lucide-react";

type ServerType = "US_MAIN" | "US_MONDAYS" | "EU_MAIN" | "EU_MONDAYS";

interface MapOption {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  _count: { votes: number };
}

interface VotingPeriod {
  id: string;
  serverType: ServerType;
  startsAt: string;
  endsAt: string;
  wipeDate: string | null;
  isActive: boolean;
  createdAt: string;
  mapOptions: { mapOption: MapOption }[];
  _count: { votes: number };
}

const SERVER_LABELS: Record<ServerType, string> = {
  US_MAIN: "US Main",
  US_MONDAYS: "US Mondays",
  EU_MAIN: "EU Main",
  EU_MONDAYS: "EU Mondays",
};

const SERVERS: ServerType[] = ["US_MAIN", "US_MONDAYS", "EU_MAIN", "EU_MONDAYS"];

export default function AdminMapVotingPage() {
  const { status } = useSession();
  const router = useRouter();

  const [mapOptions, setMapOptions] = useState<MapOption[]>([]);
  const [votingPeriods, setVotingPeriods] = useState<VotingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map Option Form
  const [showMapForm, setShowMapForm] = useState(false);
  const [mapForm, setMapForm] = useState({
    id: "",
    name: "",
    description: "",
    imageUrl: "",
  });

  // Voting Period Form
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    serverType: "US_MAIN" as ServerType,
    startsAt: "",
    endsAt: "",
    wipeDate: "",
    mapOptionIds: [] as string[],
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router]);

  async function fetchData() {
    try {
      const [mapsRes, periodsRes] = await Promise.all([
        fetch("/api/admin/map-options"),
        fetch("/api/admin/voting-periods"),
      ]);

      if (!mapsRes.ok || !periodsRes.ok) {
        if (mapsRes.status === 403 || periodsRes.status === 403) {
          setError("You don't have permission to access this page.");
          return;
        }
        throw new Error("Failed to fetch data");
      }

      const mapsData = await mapsRes.json();
      const periodsData = await periodsRes.json();

      setMapOptions(mapsData.mapOptions || []);
      setVotingPeriods(periodsData.votingPeriods || []);
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMapSubmit(e: React.FormEvent) {
    e.preventDefault();

    const method = mapForm.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/map-options", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapForm),
    });

    if (res.ok) {
      setShowMapForm(false);
      setMapForm({ id: "", name: "", description: "", imageUrl: "" });
      fetchData();
    }
  }

  async function handleDeleteMap(id: string) {
    if (!confirm("Are you sure you want to delete this map option?")) return;

    const res = await fetch(`/api/admin/map-options?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchData();
    }
  }

  async function handlePeriodSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/admin/voting-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(periodForm),
    });

    if (res.ok) {
      setShowPeriodForm(false);
      setPeriodForm({
        serverType: "US_MAIN",
        startsAt: "",
        endsAt: "",
        wipeDate: "",
        mapOptionIds: [],
      });
      fetchData();
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    const res = await fetch("/api/admin/voting-periods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });

    if (res.ok) {
      fetchData();
    }
  }

  async function handleDeletePeriod(id: string) {
    if (!confirm("Are you sure you want to delete this voting period?")) return;

    const res = await fetch(`/api/admin/voting-periods?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchData();
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
            <Map className="h-8 w-8 text-rust-500" />
            Map Voting Admin
          </h1>
          <p className="text-zinc-400">Manage maps and voting periods</p>
        </div>

        {/* Map Options Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Map Options</h2>
            <button
              onClick={() => {
                setMapForm({ id: "", name: "", description: "", imageUrl: "" });
                setShowMapForm(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Map
            </button>
          </div>

          {showMapForm && (
            <div className="card p-4 mb-4">
              <form onSubmit={handleMapSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={mapForm.name}
                    onChange={(e) =>
                      setMapForm({ ...mapForm, name: e.target.value })
                    }
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={mapForm.description}
                    onChange={(e) =>
                      setMapForm({ ...mapForm, description: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={mapForm.imageUrl}
                    onChange={(e) =>
                      setMapForm({ ...mapForm, imageUrl: e.target.value })
                    }
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">
                    {mapForm.id ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMapForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mapOptions.map((map) => (
              <div key={map.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {map.imageUrl ? (
                      <div className="h-10 w-10 rounded bg-zinc-800 overflow-hidden">
                        <img
                          src={map.imageUrl}
                          alt={map.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded bg-zinc-800 flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-zinc-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-white">{map.name}</h3>
                      {map.description && (
                        <p className="text-sm text-zinc-400">{map.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setMapForm({
                          id: map.id,
                          name: map.name,
                          description: map.description || "",
                          imageUrl: map.imageUrl || "",
                        });
                        setShowMapForm(true);
                      }}
                      className="p-2 text-zinc-400 hover:text-white"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMap(map.id)}
                      className="p-2 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {mapOptions.length === 0 && (
              <p className="text-zinc-500 col-span-full">No map options yet.</p>
            )}
          </div>
        </section>

        {/* Voting Periods Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Voting Periods</h2>
            <button
              onClick={() => setShowPeriodForm(true)}
              className="btn-primary flex items-center gap-2"
              disabled={mapOptions.length === 0}
            >
              <Plus className="h-4 w-4" />
              Create Voting Period
            </button>
          </div>

          {showPeriodForm && (
            <div className="card p-4 mb-4">
              <form onSubmit={handlePeriodSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Server *
                  </label>
                  <select
                    value={periodForm.serverType}
                    onChange={(e) =>
                      setPeriodForm({
                        ...periodForm,
                        serverType: e.target.value as ServerType,
                      })
                    }
                    className="input w-full"
                    required
                  >
                    {SERVERS.map((server) => (
                      <option key={server} value={server}>
                        {SERVER_LABELS[server]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      Starts At *
                    </label>
                    <input
                      type="datetime-local"
                      value={periodForm.startsAt}
                      onChange={(e) =>
                        setPeriodForm({ ...periodForm, startsAt: e.target.value })
                      }
                      className="input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      Ends At *
                    </label>
                    <input
                      type="datetime-local"
                      value={periodForm.endsAt}
                      onChange={(e) =>
                        setPeriodForm({ ...periodForm, endsAt: e.target.value })
                      }
                      className="input w-full"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Wipe Date (optional)
                  </label>
                  <input
                    type="date"
                    value={periodForm.wipeDate}
                    onChange={(e) =>
                      setPeriodForm({ ...periodForm, wipeDate: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Select Maps *
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {mapOptions.map((map) => (
                      <label
                        key={map.id}
                        className="flex items-center gap-2 p-2 rounded bg-zinc-800 cursor-pointer hover:bg-zinc-700"
                      >
                        <input
                          type="checkbox"
                          checked={periodForm.mapOptionIds.includes(map.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPeriodForm({
                                ...periodForm,
                                mapOptionIds: [...periodForm.mapOptionIds, map.id],
                              });
                            } else {
                              setPeriodForm({
                                ...periodForm,
                                mapOptionIds: periodForm.mapOptionIds.filter(
                                  (id) => id !== map.id
                                ),
                              });
                            }
                          }}
                          className="rounded border-zinc-600"
                        />
                        <span className="text-white">{map.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={periodForm.mapOptionIds.length === 0}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPeriodForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {votingPeriods.map((period) => (
              <div key={period.id} className="card p-4">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          period.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {period.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="text-white font-medium">
                        {SERVER_LABELS[period.serverType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(period.startsAt).toLocaleDateString()} -{" "}
                        {new Date(period.endsAt).toLocaleDateString()}
                      </span>
                      <span>{period._count.votes} votes</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {period.mapOptions.map((pm) => (
                        <span
                          key={pm.mapOption.id}
                          className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300"
                        >
                          {pm.mapOption.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleToggleActive(period.id, period.isActive)
                      }
                      className={`p-2 rounded ${
                        period.isActive
                          ? "text-yellow-400 hover:bg-yellow-400/10"
                          : "text-green-400 hover:bg-green-400/10"
                      }`}
                      title={period.isActive ? "Deactivate" : "Activate"}
                    >
                      {period.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeletePeriod(period.id)}
                      className="p-2 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {votingPeriods.length === 0 && (
              <p className="text-zinc-500">No voting periods yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
