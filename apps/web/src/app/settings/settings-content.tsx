"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  EyeOff,
  Eye,
  Users,
  UserPlus,
} from "lucide-react";
import { Navbar } from "@/components/navbar";

interface FriendUser {
  id: string;
  steamId: string | null;
  steamName: string | null;
  discordName: string;
  discordAvatar: string | null;
}

interface FriendListItem {
  friendshipId: string;
  user: FriendUser;
}

interface PendingRequest {
  friendshipId: string;
  user: FriendUser;
  createdAt: string;
}

interface TopFriendData {
  position: number;
  user: FriendUser;
}

export function SettingsContent({
  hideStats: initialHideStats,
  friendsList,
  pendingRequests: initialPendingRequests,
  topFriends: initialTopFriends,
}: {
  hideStats: boolean;
  friendsList: FriendListItem[];
  pendingRequests: PendingRequest[];
  topFriends: TopFriendData[];
}) {
  const router = useRouter();
  const [hideStats, setHideStats] = useState(initialHideStats);
  const [saving, setSaving] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
  const [selectedTopFriends, setSelectedTopFriends] = useState<string[]>(
    initialTopFriends.map((tf) => tf.user.id)
  );
  const [topFriendsSaving, setTopFriendsSaving] = useState(false);

  async function toggleHideStats() {
    const newValue = !hideStats;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideStats: newValue }),
      });
      if (res.ok) {
        setHideStats(newValue);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptRequest(friendshipId: string) {
    const res = await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "accept" }),
    });
    if (res.ok) {
      setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
      router.refresh();
    }
  }

  async function handleDeclineRequest(friendshipId: string) {
    const res = await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "decline" }),
    });
    if (res.ok) {
      setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    }
  }

  function toggleTopFriend(friendId: string) {
    setSelectedTopFriends((prev) => {
      if (prev.includes(friendId)) return prev.filter((id) => id !== friendId);
      if (prev.length >= 5) return prev;
      return [...prev, friendId];
    });
  }

  async function saveTopFriends() {
    setTopFriendsSaving(true);
    try {
      const friends = selectedTopFriends.map((friendId, i) => ({
        friendId,
        position: i + 1,
      }));

      const res = await fetch("/api/friends/top", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friends }),
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setTopFriendsSaving(false);
    }
  }

  const topFriendsChanged =
    JSON.stringify(selectedTopFriends) !==
    JSON.stringify(initialTopFriends.map((tf) => tf.user.id));

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        {/* Privacy Section */}
        <section className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            {hideStats ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            Privacy
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Hide Stats</p>
              <p className="text-sm text-zinc-400">Other players won&apos;t be able to see your stats on your profile.</p>
            </div>
            <button
              onClick={toggleHideStats}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                hideStats ? "bg-rust-500" : "bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hideStats ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Top Friends Section */}
        <section className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Friends
          </h2>
          <p className="text-sm text-zinc-400 mb-4">Select up to 5 friends to feature on your profile. Order determines position.</p>

          {friendsList.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No friends yet. Add some friends first!</p>
          ) : (
            <div className="space-y-2">
              {friendsList.map((f) => {
                const isSelected = selectedTopFriends.includes(f.user.id);
                const position = selectedTopFriends.indexOf(f.user.id) + 1;
                return (
                  <button
                    key={f.user.id}
                    onClick={() => toggleTopFriend(f.user.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
                      isSelected ? "bg-rust-500/10 border border-rust-500/30" : "hover:bg-zinc-800 border border-transparent"
                    }`}
                  >
                    {isSelected && (
                      <span className="h-6 w-6 rounded-full bg-rust-500 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                        {position}
                      </span>
                    )}
                    {f.user.discordAvatar ? (
                      <Image src={f.user.discordAvatar} alt="" width={32} height={32} className="rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                    <p className="text-sm text-white truncate">{f.user.steamName ?? f.user.discordName}</p>
                  </button>
                );
              })}
            </div>
          )}

          {topFriendsChanged && (
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setSelectedTopFriends(initialTopFriends.map((tf) => tf.user.id))}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button onClick={saveTopFriends} disabled={topFriendsSaving} className="btn-primary text-sm">
                {topFriendsSaving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </section>

        {/* Friend Requests Section */}
        <section className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Friend Requests
            {pendingRequests.length > 0 && (
              <span className="h-5 w-5 rounded-full bg-rust-500 text-white text-xs flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </h2>

          {pendingRequests.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.friendshipId} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {req.user.discordAvatar ? (
                      <Image src={req.user.discordAvatar} alt="" width={32} height={32} className="rounded-full flex-shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                    <p className="text-sm text-white truncate">{req.user.steamName ?? req.user.discordName}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleAcceptRequest(req.friendshipId)} className="btn-primary text-xs px-2 py-1">Accept</button>
                    <button onClick={() => handleDeclineRequest(req.friendshipId)} className="btn-secondary text-xs px-2 py-1">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
