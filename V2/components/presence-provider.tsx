"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useWallet } from "@/hooks/use-wallet"; // Adjust this import path if needed

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const WS_BASE  = API_BASE.replace(/^http/, "ws");

// Create a context to hold our set of online wallets
const PresenceContext = createContext<Set<string>>(new Set());

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const addressRef = useRef<string | undefined>(address);

  // Keep latest address available to the socket's handlers without
  // forcing a reconnect every time the wallet value changes.
  useEffect(() => {
    addressRef.current = address;

    // If the socket is already open and we now have an address
    // (or the address changed), send/re-send hello immediately.
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && address) {
      ws.send(JSON.stringify({ type: "hello", wallet: address }));
    }
  }, [address]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws/presence`);
      wsRef.current = ws;

      ws.onopen = () => {
        const current = addressRef.current;
        if (current) {
          ws.send(JSON.stringify({ type: "hello", wallet: current }));
        }
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "presence" && Array.isArray(msg.online)) {
            setOnlineSet(new Set(msg.online.map((w: string) => w.toLowerCase())));
          }
        } catch {}
      };

      ws.onclose = () => {
        if (cancelled) return;
        // Reconnect after a short delay so presence keeps working
        // through network blips / server restarts.
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []); // Only set up the socket once per provider lifetime

  return (
    <PresenceContext.Provider value={onlineSet}>
      {children}
    </PresenceContext.Provider>
  );
}

// Custom hook so any page can instantly grab the online list
export const usePresence = () => useContext(PresenceContext);