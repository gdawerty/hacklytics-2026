import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import GlobeScene from "@/components/GlobeScene";

export default function Dashboard() {
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

      <div className="absolute right-6 top-6 z-30 flex items-center gap-2">
        <Link
          to="/about"
          className="rounded-md border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-white/75 backdrop-blur-md transition-colors hover:border-cyan-300/55 hover:text-cyan-200"
        >
          About
        </Link>
        <Link
          to="/contact"
          className="rounded-md border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-white/75 backdrop-blur-md transition-colors hover:border-cyan-300/55 hover:text-cyan-200"
        >
          Contact
        </Link>
      </div>

    </div>
  );
}
