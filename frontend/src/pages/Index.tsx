import { Suspense, useState } from "react";
import GlobeScene from "@/components/GlobeScene";

export default function Index() {
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">

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
          <GlobeScene onSelectionChange={setIsZoomedIn} />
        </Suspense>
      </div>

      {/* ── Header ── */}
      <div
        className="absolute top-8 left-0 right-0 pointer-events-none text-center transition-all duration-300"
        style={{
          zIndex: 10,
          opacity: isZoomedIn ? 0 : 1,
          transform: isZoomedIn ? "translateY(-12px)" : "translateY(0)",
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ color: "rgba(255,255,255,0.92)" }}>
          Humanitarian Crisis Predictor
        </h1>
      </div>

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
