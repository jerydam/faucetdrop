"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { SpinWheel } from "@/components/SpinWheel";
import { Sparkles, Plus, Zap, Link2, Pencil, Trophy } from "lucide-react";

const DEMO_NAMES = ["Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace", "Henry"];

export default function LandingPage() {
  const rotRef = useRef(0);
  const animRef = useRef<number>(0);
  const [rotation, setRotation] = React.useState(0);

  useEffect(() => {
    const tick = () => {
      rotRef.current += 0.25;
      setRotation(rotRef.current);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#060B14", fontFamily: "'Space Grotesk', sans-serif", color: "#E8EDF8" }}
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "#7C5CFC", filter: "blur(120px)", opacity: 0.12, top: -150, left: -100 }} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "#FF3B5C", filter: "blur(120px)", opacity: 0.1, top: 0, right: -80 }} />
        <div style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "#00C896", filter: "blur(120px)", opacity: 0.08, bottom: -50, left: "35%" }} />
      </div>

      {/* Nav */}
      <nav
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 32px", borderBottom: "1px solid #1E2E4A",
          background: "rgba(6,11,20,0.8)", backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00C896", boxShadow: "0 0 8px #00C896" }} />
          FaucetDrops <span style={{ color: "#7C5CFC" }}>Spinner</span>
        </div>
        <Link href="/spinner/create">
          <button
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 20px", borderRadius: 9,
              background: "linear-gradient(135deg, #7C5CFC, #FF3B5C)",
              color: "#fff", fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(124,92,252,0.35)",
            }}
          >
            <Plus size={14} /> Create Room
          </button>
        </Link>
      </nav>

      {/* Hero */}
      <section
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "60px 32px", position: "relative", zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", gap: 64,
            maxWidth: 1060, width: "100%", flexWrap: "wrap", justifyContent: "center",
          }}
        >
          {/* Text */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 14px", borderRadius: 20,
                border: "1px solid rgba(0,200,150,0.3)",
                background: "rgba(0,200,150,0.08)",
                color: "#00C896", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.5px", marginBottom: 20,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C896", display: "inline-block", animation: "pulse 2s infinite" }} />
              LIVE &amp; VERIFIABLY FAIR
            </div>

            <h1
              style={{
                fontSize: "clamp(38px, 6vw, 66px)", fontWeight: 900,
                lineHeight: 1.04, marginBottom: 18, letterSpacing: "-1px",
              }}
            >
              The Fairest<br />
              <span
                style={{
                  background: "linear-gradient(135deg, #FFD166, #FF3B5C, #7C5CFC)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Spin Platform
              </span>
            </h1>

            <p style={{ color: "#6B7FA3", fontSize: 16, lineHeight: 1.65, marginBottom: 36, maxWidth: 440 }}>
              Create a unique spin room, upload participants via CSV or text file,
              share the link, and let the wheel decide — random, fair, unforgettable.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/spinner/create">
                <button
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "14px 30px", borderRadius: 10,
                    background: "linear-gradient(135deg, #7C5CFC, #FF3B5C)",
                    color: "#fff", fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
                    boxShadow: "0 4px 24px rgba(124,92,252,0.4)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(124,92,252,0.55)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(124,92,252,0.4)"; }}
                >
                  <Sparkles size={16} /> Create Spin Room
                </button>
              </Link>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 36, marginTop: 44, flexWrap: "wrap" }}>
              {[
                { num: "2.4K", label: "Rooms Created" },
                { num: "18K", label: "Spins Run" },
                { num: "99.9%", label: "Uptime" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF8" }}>{s.num}</div>
                  <div style={{ fontSize: 12, color: "#6B7FA3", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Wheel */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            <div
              style={{
                position: "absolute", inset: -30, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(124,92,252,0.18), transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <SpinWheel names={DEMO_NAMES} spinning={false} rotation={rotation} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "0 32px 72px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 16, maxWidth: 1060, margin: "0 auto",
          }}
        >
          {[
            { icon: <Zap size={18} />, color: "#7C5CFC", bg: "rgba(124,92,252,0.12)", title: "Bulk File Upload", desc: "Drop a .txt or .csv and we'll parse every name instantly. No copy-paste marathons." },
            { icon: <Link2 size={18} />, color: "#00C896", bg: "rgba(0,200,150,0.12)", title: "Shareable Slug", desc: "Every room gets a unique URL. Share it and anyone can join and watch live." },
            { icon: <Pencil size={18} />, color: "#FF3B5C", bg: "rgba(255,59,92,0.12)", title: "Editable Anytime", desc: "Add, remove, or rename participants mid-session. The wheel updates instantly." },
            { icon: <Trophy size={18} />, color: "#FFD166", bg: "rgba(255,209,102,0.12)", title: "Spin History", desc: "Full winner log persisted per room. Auto-remove winners to prevent duplicates." },
          ].map(f => (
            <div
              key={f.title}
              style={{
                background: "#0D1526", border: "1px solid #1E2E4A",
                borderRadius: 14, padding: "22px 20px",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,92,252,0.4)")}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = "#1E2E4A")}
            >
              <div
                style={{
                  width: 38, height: 38, borderRadius: 9, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  background: f.bg, color: f.color, marginBottom: 13,
                }}
              >
                {f.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: "#E8EDF8" }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "#6B7FA3", lineHeight: 1.55 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}