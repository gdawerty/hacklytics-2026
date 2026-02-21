import { Suspense } from "react";
import { Link } from "react-router-dom";
import GlobeScene from "@/components/GlobeScene";
import StarfieldCanvas from "@/components/StarfieldCanvas";

export default function Index() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">

      {/* ── Layer 0: Animated starfield ── */}
      <StarfieldCanvas />

      {/* ── Layer 1: Globe ── */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center font-mono text-[11px] tracking-widest"
              style={{ color: "rgba(34,211,238,0.4)" }}>
              INITIALIZING…
            </div>
          }
        >
          <GlobeScene />
        </Suspense>
      </div>

      {/* ── Header ── */}
      <div className="absolute top-8 left-0 right-0 pointer-events-none text-center" style={{ zIndex: 10 }}>
        <p className="text-[8px] font-mono uppercase tracking-[0.35em] mb-2"
          style={{ color: "rgba(34,211,238,0.45)" }}>
          SIGINT · HUMANITARIAN INTELLIGENCE PLATFORM
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ color: "rgba(255,255,255,0.92)" }}>
          Humanitarian Crisis Predictor
        </h1>
        <p className="mt-2 text-[11px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(255,255,255,0.22)" }}>
          Scroll to zoom · Drag to rotate · Hover a country · Click to open dossier
        </p>
      </div>

      {/* About link */}
      <Link
        to="/about"
        className="absolute top-8 right-8 z-10 px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors pointer-events-auto text-sm font-medium"
      >
        About
      </Link>

      {/* About link */}
      <Link
        to="/about"
        className="absolute top-8 right-8 z-10 px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors pointer-events-auto text-sm font-medium"
      >
        About
      </Link>

      {/* ── Legend ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1.5"
        style={{ zIndex: 10 }}>
        <div className="h-2 w-56 rounded-full"
          style={{ background: "linear-gradient(to right, #60a5fa, #34d399, #facc15, #fb923c, #f87171)" }} />
        <div className="flex w-56 justify-between text-[9px] font-mono uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.22)" }}>
          <span>5%</span>
          <span>Crisis Likelihood</span>
          <span>95%</span>
        </div>
      </div>
    </div>
  );
}
