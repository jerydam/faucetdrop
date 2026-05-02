"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { SpinWheel, getWinnerIndex } from "@/components/SpinWheel";
import { Upload, Share2, Plus, X, Crown, Trophy, RotateCcw, Play, Pencil, Check, Settings } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app";

const COLORS = [
  "#7C5CFC","#FF3B5C","#00C896","#FFD166","#06C2FF",
  "#FF8C42","#A78BFA","#FF6B9D","#4ECDC4","#45B7D1",
];
const getColor = (i: number) => COLORS[i % COLORS.length];

interface RoomData {
  slug: string;
  name: string;
  description: string;
  participants: string[];
  winners: string[];
}

function Confetti() {
  const colors = ["#7C5CFC","#FF3B5C","#00C896","#FFD166","#06C2FF","#FF8C42"];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, overflow: "hidden" }}>
      {Array.from({ length: 70 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: Math.random() > 0.5 ? 8 : 6,
            height: Math.random() > 0.5 ? 8 : 6,
            borderRadius: Math.random() > 0.5 ? "50%" : 0,
            background: colors[Math.floor(Math.random() * colors.length)],
            left: `${Math.random() * 100}%`,
            top: `${40 + Math.random() * 20}%`,
            animation: `confettiFall ${1.2 + Math.random() * 2}s ease ${Math.random() * 0.5}s forwards`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(${Math.random() > 0.5 ? "" : "-"}${60 + Math.random() * 60}px, 220px) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}

export default function SpinnerRoom() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [addingName, setAddingName] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState("");

  const [autoRemove, setAutoRemove] = useState(false);
  const [confettiEnabled, setConfettiEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [winHistory, setWinHistory] = useState<{ name: string; ts: string }[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number>(0);
  const rotRef = useRef(0);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/spinners/${slug}`);
      const data = await res.json();
      if (data.success) {
        setRoom(data.data);
        setWinHistory((data.data.winners || []).map((name: string) => ({ name, ts: "" })));
      } else {
        toast.error("Room not found");
        router.push("/");
      }
    } catch {
      toast.error("Failed to fetch room");
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  const syncBackend = useCallback(async (participants: string[], winners?: string[]) => {
    try {
      await fetch(`${BACKEND_URL}/api/spinners/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants, winners: winners ?? winHistory.map(w => w.name) }),
      });
    } catch { /* silent */ }
  }, [slug, winHistory]);

  /* ---------- FILE UPLOAD ---------- */
  const handleFile = (file: File) => {
    if (!room) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const names = (ev.target?.result as string)
        .split(/[\n,\r]+/).map(n => n.trim()).filter(Boolean);
      const merged = Array.from(new Set([...room.participants, ...names]));
      const added = merged.length - room.participants.length;
      setRoom({ ...room, participants: merged });
      await syncBackend(merged);
      toast.success(`Added ${added} new name${added !== 1 ? "s" : ""} from file`);
    };
    reader.readAsText(file);
  };

  /* ---------- PARTICIPANTS CRUD ---------- */
  const addParticipant = async () => {
    const name = addingName.trim();
    if (!name || !room) return;
    const updated = [...room.participants, name];
    setRoom({ ...room, participants: updated });
    setAddingName("");
    await syncBackend(updated);
    addInputRef.current?.focus();
  };

  const removeParticipant = async (i: number) => {
    if (!room) return;
    const updated = room.participants.filter((_, idx) => idx !== i);
    setRoom({ ...room, participants: updated });
    await syncBackend(updated);
  };

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditingVal(room!.participants[i]);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const commitEdit = async () => {
    if (editingIdx === null || !room) return;
    const name = editingVal.trim();
    if (!name) { setEditingIdx(null); return; }
    const updated = [...room.participants];
    updated[editingIdx] = name;
    setRoom({ ...room, participants: updated });
    setEditingIdx(null);
    await syncBackend(updated);
    toast.success(`Renamed to "${name}"`);
  };

  /* ---------- SPIN ---------- */
  const doSpin = () => {
    if (!room || spinning || room.participants.length < 2) return;
    setShowWinner(false);
    setWinner(null);
    setShowConfetti(false);
    setSpinning(true);

    const n = room.participants.length;
    const arc = 360 / n;

    // Pick a random winner index
    const targetWinIdx = Math.floor(Math.random() * n);

    // Calculate how much to rotate so targetWinIdx lands under the pointer.
    // Pointer is at RIGHT (0° screen). SpinWheel draws with offset -90deg.
    // Segment i starts at: (rotation - 90 + i * arc) degrees from 12 o'clock
    // We want segment targetWinIdx's center to be at the pointer (right = 0° = 90° from top)
    // => targetWinIdx * arc + arc/2 + final_rotation - 90 ≡ 0 (mod 360)
    // => final_rotation = 90 - targetWinIdx * arc - arc/2 (mod 360)
    const slotAngle = targetWinIdx * arc + arc / 2;
    const targetMod = ((90 - slotAngle) % 360 + 360) % 360;
    const currentMod = ((rotRef.current % 360) + 360) % 360;
    const extraSpins = 6 + Math.random() * 6;
    const shortDelta = ((targetMod - currentMod) % 360 + 360) % 360;
    const totalDelta = extraSpins * 360 + shortDelta;

    const startRot = rotRef.current;
    const targetRot = startRot + totalDelta;
    const duration = 4500 + Math.random() * 1500;
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const r = startRot + (targetRot - startRot) * ease(t);
      rotRef.current = r;
      setRotation(r);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        rotRef.current = targetRot;
        setRotation(targetRot);
        setSpinning(false);

        // ---- WINNER VERIFICATION using rotation-based calculation ----
        const verifiedIdx = getWinnerIndex(targetRot, n);
        const winnerName = room.participants[verifiedIdx];

        setWinner(winnerName);
        setTimeout(() => {
          setShowWinner(true);
          if (confettiEnabled) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000); }
        }, 150);

        const newEntry = { name: winnerName, ts: new Date().toLocaleTimeString() };
        setWinHistory(prev => [newEntry, ...prev]);

        if (autoRemove) {
          const updated = room.participants.filter((_, idx) => idx !== verifiedIdx);
          setRoom({ ...room, participants: updated });
          syncBackend(updated, [winnerName, ...winHistory.map(w => w.name)]);
        } else {
          syncBackend(room.participants, [winnerName, ...winHistory.map(w => w.name)]);
        }
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => cancelAnimationFrame(animFrameRef.current), []);

  /* ---------- COPY ---------- */
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  /* ---------- LOADING / NOT FOUND ---------- */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#060B14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#6B7FA3", fontFamily: "'Space Grotesk', sans-serif" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎡</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Loading room...</div>
        </div>
      </div>
    );
  }
  if (!room) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#060B14", color: "#E8EDF8", fontFamily: "'Space Grotesk', sans-serif" }}>
      {showConfetti && <Confetti />}

      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "#7C5CFC", filter: "blur(120px)", opacity: 0.08, top: -100, left: -80 }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "#FF3B5C", filter: "blur(120px)", opacity: 0.06, bottom: 0, right: -60 }} />
      </div>

      {/* Room Header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 28px", borderBottom: "1px solid #1E2E4A",
          background: "rgba(13,21,38,0.9)", backdropFilter: "blur(12px)",
          flexWrap: "wrap", gap: 10, position: "sticky", top: 0, zIndex: 100,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 800 }}>
            {room.name}
            <span
              style={{
                padding: "3px 10px", borderRadius: 20,
                background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.3)",
                color: "#00C896", fontSize: 11, fontWeight: 700, letterSpacing: "0.3px",
              }}
            >● LIVE</span>
          </div>
          {room.description && <div style={{ fontSize: 12, color: "#6B7FA3", marginTop: 2 }}>{room.description}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Slug */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#0D1526", border: "1px solid #1E2E4A", borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: "#6B7FA3", fontWeight: 600 }}>SLUG</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#00C896" }}>{slug}</span>
            <button onClick={copyLink} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7FA3", fontSize: 14, padding: 0 }} title="Copy">⧉</button>
          </div>
          <input type="file" ref={fileRef} accept=".txt,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          {[
            { icon: <Upload size={13} />, label: "Upload File", action: () => fileRef.current?.click() },
            { icon: <Share2 size={13} />, label: "Share Link", action: copyLink },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                background: "#0D1526", border: "1px solid #1E2E4A", borderRadius: 8,
                color: "#6B7FA3", fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7C5CFC"; (e.currentTarget as HTMLButtonElement).style.color = "#7C5CFC"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1E2E4A"; (e.currentTarget as HTMLButtonElement).style.color = "#6B7FA3"; }}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, padding: "24px 28px", maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Wheel stage */}
        <div style={{ background: "#0D1526", border: "1px solid #1E2E4A", borderRadius: 16, overflow: "hidden" }}>
          <div
            style={{
              padding: "32px 28px", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 24, minHeight: 500,
              background: "radial-gradient(circle at 50% 55%, rgba(124,92,252,0.07), transparent 65%)",
              position: "relative",
            }}
          >
            {/* Winner Banner */}
            {showWinner && winner && (
              <div
                style={{
                  width: "100%", maxWidth: 380, padding: "18px 22px",
                  borderRadius: 13, textAlign: "center",
                  background: "linear-gradient(135deg, rgba(255,209,102,0.1), rgba(255,59,92,0.07))",
                  border: "1px solid rgba(255,209,102,0.35)",
                  animation: "fadeUp 0.4s ease",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>👑</div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#FFD166", marginBottom: 5 }}>Winner!</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{winner}</div>
              </div>
            )}

            <SpinWheel names={room.participants} spinning={spinning} rotation={rotation} />

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={doSpin}
                disabled={spinning || room.participants.length < 2}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "15px 32px", borderRadius: 11, border: "none",
                  background: (spinning || room.participants.length < 2)
                    ? "#182440"
                    : "linear-gradient(135deg, #FFD166, #FF3B5C)",
                  color: (spinning || room.participants.length < 2) ? "#6B7FA3" : "#060B14",
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 17,
                  cursor: (spinning || room.participants.length < 2) ? "not-allowed" : "pointer",
                  boxShadow: spinning ? "none" : "0 4px 24px rgba(255,59,92,0.35)",
                  transition: "all 0.2s", minWidth: 140,
                }}
              >
                {spinning
                  ? <><RotateCcw size={18} style={{ animation: "spin 1s linear infinite" }} /> Spinning...</>
                  : <><Play size={18} /> Spin!</>}
              </button>

              {showWinner && !spinning && (
                <button
                  onClick={() => { setWinner(null); setShowWinner(false); }}
                  title="Clear winner"
                  style={{
                    width: 52, height: 52, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#0D1526", border: "1px solid #1E2E4A", cursor: "pointer", color: "#6B7FA3",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#6B7FA3"; (e.currentTarget as HTMLButtonElement).style.color = "#E8EDF8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1E2E4A"; (e.currentTarget as HTMLButtonElement).style.color = "#6B7FA3"; }}
                >
                  <RotateCcw size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Participants */}
          <div style={{ background: "#0D1526", border: "1px solid #1E2E4A", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E2E4A", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
              👥 Participants
              <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 10, background: "#182440", border: "1px solid #1E2E4A", fontSize: 11, color: "#7C5CFC", fontWeight: 700 }}>
                {room.participants.length}
              </span>
            </div>
            <div style={{ padding: 14 }}>
              {/* Upload strip */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "2px dashed #1E2E4A", borderRadius: 8, padding: "10px",
                  textAlign: "center", cursor: "pointer", marginBottom: 10,
                  fontSize: 12, color: "#6B7FA3", transition: "all 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#7C5CFC"; (e.currentTarget as HTMLDivElement).style.color = "#7C5CFC"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1E2E4A"; (e.currentTarget as HTMLDivElement).style.color = "#6B7FA3"; }}
              >
                📂 Upload .txt or .csv file
              </div>

              {/* Add input */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  ref={addInputRef}
                  type="text"
                  placeholder="Add a name..."
                  value={addingName}
                  onChange={e => setAddingName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addParticipant(); }}
                  style={{ flex: 1, height: 36, padding: "0 12px", background: "#060B14", border: "1px solid #1E2E4A", borderRadius: 8, color: "#E8EDF8", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: "none" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#7C5CFC")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#1E2E4A")}
                />
                <button
                  onClick={addParticipant}
                  style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124,92,252,0.15)", border: "1px solid rgba(124,92,252,0.3)", color: "#7C5CFC", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* List */}
              <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
                {room.participants.map((name, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, transition: "background 0.15s", cursor: "default" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = "#182440")}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: getColor(i), flexShrink: 0 }} />
                    {editingIdx === i ? (
                      <>
                        <input
                          ref={editInputRef}
                          value={editingVal}
                          onChange={e => setEditingVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingIdx(null); }}
                          onBlur={commitEdit}
                          style={{ flex: 1, height: 26, padding: "0 8px", background: "#060B14", border: "1px solid #7C5CFC", borderRadius: 6, color: "#E8EDF8", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, outline: "none" }}
                        />
                        <button onClick={commitEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#00C896", padding: 0 }}><Check size={13} /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        <button
                          onClick={() => startEdit(i)}
                          title="Rename"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7FA3", padding: 0, opacity: 0, transition: "opacity 0.15s" }}
                          className="edit-btn"
                        ><Pencil size={11} /></button>
                        <button
                          onClick={() => removeParticipant(i)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7FA3", padding: 0, opacity: 0, transition: "opacity 0.15s", fontSize: 16, lineHeight: 1 }}
                          className="del-btn"
                        ><X size={13} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Spin History */}
          {winHistory.length > 0 && (
            <div style={{ background: "#0D1526", border: "1px solid #1E2E4A", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #1E2E4A", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700 }}>
                <Trophy size={14} style={{ color: "#FFD166", marginRight: 8 }} /> Spin History
                <button
                  onClick={() => setWinHistory([])}
                  style={{ marginLeft: "auto", fontSize: 11, color: "#6B7FA3", background: "none", border: "none", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#FF3B5C")}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#6B7FA3")}
                >
                  Clear all
                </button>
              </div>
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6, maxHeight: 190, overflowY: "auto" }}>
                {winHistory.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                      borderRadius: 8, background: "rgba(255,209,102,0.06)", border: "1px solid rgba(255,209,102,0.12)",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{i === 0 ? "👑" : "🏅"}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#FFD166", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
                    {w.ts && <span style={{ fontSize: 10, color: "#6B7FA3" }}>{w.ts}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          <div style={{ background: "#0D1526", border: "1px solid #1E2E4A", borderRadius: 14, overflow: "hidden" }}>
            <button
              onClick={() => setShowSettings(s => !s)}
              style={{
                width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, fontWeight: 700, background: "none", border: "none",
                color: "#E8EDF8", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Settings size={14} style={{ color: "#6B7FA3" }} /> Settings
              <span style={{ marginLeft: "auto", color: "#6B7FA3", fontSize: 12 }}>{showSettings ? "▲" : "▼"}</span>
            </button>
            {showSettings && (
              <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #1E2E4A" }}>
                {[
                  { label: "Auto-remove winner after spin", val: autoRemove, set: setAutoRemove },
                  { label: "Celebration confetti on win", val: confettiEnabled, set: setConfettiEnabled },
                ].map(s => (
                  <label
                    key={s.label}
                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 12 }}
                  >
                    <input
                      type="checkbox"
                      checked={s.val}
                      onChange={e => s.set(e.target.checked)}
                      style={{ accentColor: "#7C5CFC", width: "auto", height: "auto" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#E8EDF8" }}>{s.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        div:hover .edit-btn, div:hover .del-btn { opacity: 1 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E2E4A; border-radius: 4px; }
        @media (max-width: 800px) {
          .room-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}