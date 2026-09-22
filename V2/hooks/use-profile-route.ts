"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useWallet } from "@/components/wallet-provider";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";

// MUST match the backend that /dashboard/[username] resolves usernames against.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://faucetdrop-backend.vercel.app";

const PLACEHOLDER_NAMES = new Set(["Dropee", "New User", "Anonymous"]);

export function useProfileRoute() {
  const { address: evmAddress } = useWallet();
  const { publicKey }           = useSolanaWallet();

  // Solana base58 is case-sensitive — only normalise hex.
  const address = useMemo(() => {
    const raw = publicKey?.toBase58() || evmAddress || null;
    if (!raw) return null;
    return raw.startsWith("0x") ? raw.toLowerCase() : raw;
  }, [publicKey, evmAddress]);

  const [dbUsername, setDbUsername] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!address) { setDbUsername(null); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/${address}`, { signal });
      if (!res.ok) { setDbUsername(null); return; }   // 5xx → fall back to address route
      const data = await res.json();
      const username = data.profile?.username;
      setDbUsername(username && !PLACEHOLDER_NAMES.has(username) ? username : null);
    } catch {
      setDbUsername(null);
    }
  }, [address]);

  // Re-fetch whenever the ADDRESS changes (covers wallet switch and chain switch).
  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  // Live updates when the user renames themselves elsewhere in the app.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.username) setDbUsername(detail.username);
      else load();                        // event without a payload → re-resolve
    };
    window.addEventListener("profileUpdated", handler);
    return () => window.removeEventListener("profileUpdated", handler);
  }, [load]);

  const profileSlug = useMemo(
    () => dbUsername ?? address,
    [dbUsername, address],
  );

  const profileHref = profileSlug
    ? `/dashboard/${encodeURIComponent(profileSlug)}`
    : "/dashboard";

  const buildProfileHref = (query?: Record<string, string>) => {
    if (!query || Object.keys(query).length === 0) return profileHref;
    const qs = new URLSearchParams(query).toString();
    return `${profileHref}?${qs}`;
  };

  return { profileSlug, dbUsername, profileHref, buildProfileHref, refresh: () => load() };
}