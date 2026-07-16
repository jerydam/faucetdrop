"use client";


import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@/hooks/use-wallet";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://conscious-adorne-faucetdrops-fc77a861.koyeb.app";

export function useProfileRoute() {
  const { address } = useWallet();
  const [dbUsername, setDbUsername] = useState<string | null>(null);

  // Re-fetch whenever the ADDRESS changes (fixes stale username after a
  // wallet switch — the old ref-based guard never reset while connected).
  useEffect(() => {
    if (!address) {
      setDbUsername(null);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/profile/${address.toLowerCase()}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const username = data.profile?.username;
        setDbUsername(username && username !== "Dropee" ? username : null);
      })
      .catch(() => { if (!cancelled) setDbUsername(null); });
    return () => { cancelled = true; };
  }, [address]);

  // Live updates when the user renames themselves elsewhere in the app.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.username) setDbUsername(detail.username);
    };
    window.addEventListener("profileUpdated", handler);
    return () => window.removeEventListener("profileUpdated", handler);
  }, []);

  const profileSlug = useMemo(
    () => dbUsername ?? (address ? address.toLowerCase() : null),
    [dbUsername, address],
  );

  const profileHref = profileSlug ? `/dashboard/${profileSlug}` : "/dashboard";

  const buildProfileHref = (query?: Record<string, string>) => {
    if (!query || Object.keys(query).length === 0) return profileHref;
    const qs = new URLSearchParams(query).toString();
    return `${profileHref}?${qs}`;
  };

  return { profileSlug, dbUsername, profileHref, buildProfileHref };
}