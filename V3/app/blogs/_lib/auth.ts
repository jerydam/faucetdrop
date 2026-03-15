const SESSION_KEY = "blog_admin_token";
const ADMIN_KEY   = "blog_admin_info";

export function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(token: string, admin: any) {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function getAdmin(): { username: string; displayName: string; avatarUrl: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Generate a stable browser fingerprint for likes (no wallet needed)
export function getBrowserFingerprint(): string {
  if (typeof window === "undefined") return "server";
  const stored = localStorage.getItem("blog_fp");
  if (stored) return stored;
  const fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem("blog_fp", fp);
  return fp;
}

export const API = process.env.NEXT_PUBLIC_API_URL || "https://faucetdrops-indexer.onrender.com";