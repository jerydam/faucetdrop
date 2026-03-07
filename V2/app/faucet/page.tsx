"use client"

import { useEffect, useRef } from "react"
import { FaucetList } from "@/components/faucet-list"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Header } from "@/components/header"
import { NetworkGrid } from "@/components/network"

// ── Galaxy Canvas Background ─────────────────────────────────────────────────
function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let w = 0
    let h = 0

    // ── Star types: tiny drifters + mid twinklers + big anchors
    type Star = {
      x: number; y: number
      vx: number; vy: number
      r: number
      alpha: number
      alphaDir: number
      alphaSpeed: number
      layer: 0 | 1 | 2      // 0=far(slow), 1=mid, 2=near(fast)
    }

    const COUNTS = [220, 110, 55]
    const SPEEDS = [0.04, 0.12, 0.28]
    const RADII  = [[0.3, 0.8], [0.7, 1.4], [1.2, 2.6]]

    let stars: Star[] = []

    function buildStars() {
      stars = []
      COUNTS.forEach((count, layer) => {
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * SPEEDS[layer],
            vy: (Math.random() - 0.5) * SPEEDS[layer],
            r: RADII[layer][0] + Math.random() * (RADII[layer][1] - RADII[layer][0]),
            alpha: 0.2 + Math.random() * 0.8,
            alphaDir: Math.random() > 0.5 ? 1 : -1,
            alphaSpeed: 0.002 + Math.random() * 0.006,
            layer: layer as 0 | 1 | 2,
          })
        }
      })
    }

    function resize() {
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width  = w * window.devicePixelRatio
      canvas.height = h * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      buildStars()
    }

    function isDark() {
      return document.documentElement.classList.contains("dark")
    }

    function draw() {
      const dark = isDark()

      // ── Background gradient
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, Math.max(w, h) * 0.75)
      if (dark) {
        bg.addColorStop(0,   "rgba(15, 12, 30, 1)")
        bg.addColorStop(0.5, "rgba(8, 8, 20, 1)")
        bg.addColorStop(1,   "rgba(2, 4, 14, 1)")
      } else {
        bg.addColorStop(0,   "rgba(235, 240, 255, 1)")
        bg.addColorStop(0.5, "rgba(215, 225, 252, 1)")
        bg.addColorStop(1,   "rgba(195, 210, 248, 1)")
      }
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // ── Nebula clouds (soft blobs)
      const nebulas = dark
        ? [
            { x: w * 0.15, y: h * 0.2, r: w * 0.35, color: "rgba(99,40,150,0.07)" },
            { x: w * 0.8,  y: h * 0.7, r: w * 0.3,  color: "rgba(30,60,180,0.06)" },
            { x: w * 0.5,  y: h * 0.5, r: w * 0.45, color: "rgba(20,80,120,0.04)" },
          ]
        : [
            { x: w * 0.15, y: h * 0.2, r: w * 0.35, color: "rgba(130,100,220,0.06)" },
            { x: w * 0.8,  y: h * 0.7, r: w * 0.3,  color: "rgba(80,120,240,0.05)" },
            { x: w * 0.5,  y: h * 0.5, r: w * 0.45, color: "rgba(100,140,255,0.04)" },
          ]

      nebulas.forEach(n => {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r)
        g.addColorStop(0, n.color)
        g.addColorStop(1, "transparent")
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      })

      // ── Stars
      stars.forEach(s => {
        // Twinkle
        s.alpha += s.alphaDir * s.alphaSpeed
        if (s.alpha > 1)   { s.alpha = 1;   s.alphaDir = -1 }
        if (s.alpha < 0.1) { s.alpha = 0.1; s.alphaDir =  1 }

        // Drift
        s.x += s.vx
        s.y += s.vy
        if (s.x < -4) s.x = w + 4
        if (s.x > w + 4) s.x = -4
        if (s.y < -4) s.y = h + 4
        if (s.y > h + 4) s.y = -4

        // Draw
        ctx.save()
        ctx.globalAlpha = s.alpha

        if (dark) {
          // White/blue-white stars in dark mode
          const hue = s.layer === 2 ? "220,230,255" : "200,215,255"
          if (s.r > 1.5) {
            // Glow for big stars
            const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5)
            glow.addColorStop(0, `rgba(${hue},${s.alpha * 0.6})`)
            glow.addColorStop(1, "transparent")
            ctx.fillStyle = glow
            ctx.beginPath()
            ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.fillStyle = `rgba(${hue},1)`
        } else {
          // Dark navy/indigo stars in light mode
          const hue = s.layer === 2 ? "60,80,160" : "80,100,180"
          if (s.r > 1.5) {
            const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3)
            glow.addColorStop(0, `rgba(${hue},${s.alpha * 0.4})`)
            glow.addColorStop(1, "transparent")
            ctx.fillStyle = glow
            ctx.beginPath()
            ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.fillStyle = `rgba(${hue},${0.6 + s.alpha * 0.4})`
        }

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // ── Shooting star (occasional)
      // handled separately via a CSS animation overlay

      animId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden
    />
  )
}

// ── Shooting Star CSS overlay ─────────────────────────────────────────────────
function ShootingStars() {
  return (
    <>
      <style>{`
        @keyframes shoot {
          0%   { transform: translateX(0) translateY(0) rotate(-35deg); opacity: 1; }
          70%  { opacity: 0.8; }
          100% { transform: translateX(600px) translateY(300px) rotate(-35deg); opacity: 0; }
        }
        .shooting-star {
          position: fixed;
          pointer-events: none;
          z-index: 1;
          width: 120px;
          height: 1.5px;
          border-radius: 9999px;
          animation: shoot linear infinite;
        }
        .dark .shooting-star { background: linear-gradient(90deg, rgba(255,255,255,0.9) 0%, transparent 100%); }
        .shooting-star       { background: linear-gradient(90deg, rgba(60,80,180,0.7) 0%, transparent 100%); }

        .ss1 { top: 12%; left:  8%; animation-duration: 6s;  animation-delay: 0s;   }
        .ss2 { top: 28%; left: 55%; animation-duration: 9s;  animation-delay: 3.5s; }
        .ss3 { top:  5%; left: 30%; animation-duration: 7s;  animation-delay: 7s;   }
        .ss4 { top: 40%; left: 70%; animation-duration: 11s; animation-delay: 1.8s; }
        .ss5 { top: 18%; left: 80%; animation-duration: 8s;  animation-delay: 5s;   }
      `}</style>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className={`shooting-star ss${n}`} aria-hidden />
      ))}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Faucet() {
  return (
    <main className="relative min-h-screen bg-[#0f0c1e] dark:bg-[#0f0c1e]">
      {/* Galaxy layers */}
      <GalaxyBackground />
      <ShootingStars />

      {/* Content */}
      <div className="relative z-10">
        <Header pageTitle="Faucet Engine" />
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">

            <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
              <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md rounded-xl shadow-sm border border-white/60 dark:border-white/10 overflow-hidden">
                <NetworkGrid />
              </div>

              <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md rounded-xl shadow-sm border border-white/60 dark:border-white/10 overflow-hidden">
                <AnalyticsDashboard />
              </div>

              <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md rounded-xl shadow-sm border border-white/60 dark:border-white/10 overflow-hidden">
                <FaucetList />
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}