"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, User } from "lucide-react";

interface PlayerResult {
  steamId: string;
  steamName: string | null;
  discordName: string;
  discordAvatar: string | null;
  steamAvatar: string | null;
}

export function PlayerSearch({ variant = "dropdown" }: { variant?: "dropdown" | "full" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.players ?? []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(steamId: string) {
    setIsOpen(false);
    setQuery("");
    router.push(`/profile/${steamId}`);
  }

  if (variant === "full") {
    return (
      <div ref={containerRef} className="w-full max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Steam name, Discord name, or Steam ID..."
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>
        {loading && <p className="text-sm text-zinc-500 mt-4 text-center">Searching...</p>}
        {isOpen && results.length > 0 && (
          <div className="mt-4 grid gap-2">
            {results.map((player) => (
              <button
                key={player.steamId}
                onClick={() => handleSelect(player.steamId)}
                className="card flex items-center gap-3 hover:bg-zinc-800/50 transition-colors text-left w-full"
              >
                {player.discordAvatar ? (
                  <Image src={player.discordAvatar} alt="" width={40} height={40} className="rounded-full" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    <User className="h-5 w-5 text-zinc-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{player.steamName ?? player.discordName}</p>
                  {player.steamName && player.steamName !== player.discordName && (
                    <p className="text-xs text-zinc-500">{player.discordName}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        {isOpen && results.length === 0 && !loading && query.length >= 2 && (
          <p className="text-sm text-zinc-500 mt-4 text-center">No players found</p>
        )}
      </div>
    );
  }

  // Dropdown variant for navbar
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players..."
          className="w-48 pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:w-64 transition-all"
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {results.map((player) => (
            <button
              key={player.steamId}
              onClick={() => handleSelect(player.steamId)}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left"
            >
              {player.discordAvatar ? (
                <Image src={player.discordAvatar} alt="" width={32} height={32} className="rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{player.steamName ?? player.discordName}</p>
                {player.steamName && player.steamName !== player.discordName && (
                  <p className="text-xs text-zinc-500 truncate">{player.discordName}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
