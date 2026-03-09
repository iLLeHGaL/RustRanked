"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface UserMenuProps {
  user: {
    name?: string | null;
    image?: string | null;
  };
  steamId?: string | null;
}

export function UserMenu({ user, steamId }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const profileHref = steamId ? `/profile/${steamId}` : "/dashboard";

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-9 w-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-rust-500 transition-all"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "User avatar"}
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div className="h-9 w-9 bg-zinc-700 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-zinc-400" />
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-medium text-white truncate">
              {user.name || "User"}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href={profileHref}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <User className="h-4 w-4" />
              My Profile
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link
              href="/verify"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify
            </Link>
            <Link
              href="/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </Link>
            <Link
              href="/support"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              Support
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-zinc-800 py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
