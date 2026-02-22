import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GlobeScene from "@/components/GlobeScene";

export default function Dashboard() {
  const navigate = useNavigate();
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [showAegisIntro, setShowAegisIntro] = useState(false);

  useEffect(() => {
    const shouldShow = sessionStorage.getItem("showAegisIntro") === "1";
    if (!shouldShow) return;
    setShowAegisIntro(true);
    sessionStorage.removeItem("showAegisIntro");
    const timer = window.setTimeout(() => setShowAegisIntro(false), 1450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">

      {/* ── Layer 1: Globe ── */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {!showAegisIntro && (
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
        )}
      </div>

      <AnimatePresence>
        {showAegisIntro && (
          <motion.div
            key="aegis-intro"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black"
          >
            <motion.h1
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-5xl md:text-6xl font-bold tracking-tight text-white"
            >
              Aegis
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Back to Homepage — hidden when zoomed in (World view button takes over) ── */}
      {!isZoomedIn && (
        <button
          onClick={() => navigate("/")}
          className="absolute top-6 left-6 z-10 flex items-center gap-1.5 pointer-events-auto"
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "7px 13px",
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.08em",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          ← HOME
        </button>
      )}

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
          Aegis
        </h1>
      </div>

    </div>
  );
}
