import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Cpu, Network, ScanSearch, ShieldAlert } from "lucide-react";
import StarfieldCanvas from "@/components/StarfieldCanvas";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>_";

function ScrambleButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const [display, setDisplay] = useState(label);

  const scramble = () => {
    let frame = 0;
    const maxFrames = 12;
    const timer = window.setInterval(() => {
      frame += 1;
      const settled = Math.floor((frame / maxFrames) * label.length);
      if (frame >= maxFrames) {
        setDisplay(label);
        window.clearInterval(timer);
        return;
      }
      setDisplay(
        label
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < settled) return label[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );
    }, 24);
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={scramble}
      className="rounded-lg border border-[#00F0FF]/60 bg-[#00F0FF]/10 px-6 py-3 text-[12px] font-semibold text-[#c8feff] transition-colors hover:bg-[#00F0FF]/20"
      style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}
    >
      {display}
    </button>
  );
}

function NodeCard({
  mod,
  title,
  body,
  hash,
  icon: Icon,
}: {
  mod: string;
  title: string;
  body: string;
  hash: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0a]/70 p-5 backdrop-blur-xl"
    >
      <motion.div
        className="pointer-events-none absolute left-0 top-0 h-px w-full"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ background: "linear-gradient(90deg, transparent, #00F0FF, transparent)" }}
      />

      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.22em] text-[#00F0FF]/90"
          style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          {mod}
        </span>
        <Icon className="h-4 w-4 text-white/50" />
      </div>

      <h3
        className="text-lg font-extrabold tracking-tight text-white"
        style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
      <p
        className="mt-4 text-[10px] text-white/35"
        style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        {hash}
      </p>
    </motion.div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const [status] = useState(99);

  const container = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.08 },
      },
    }),
    []
  );

  const item = useMemo(
    () => ({
      hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
      show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.38, ease: "easeOut" } },
    }),
    []
  );

  const openModel = () => {
    sessionStorage.setItem("showAegisIntro", "1");
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <StarfieldCanvas />

      <motion.div variants={container} initial="hidden" animate="show" className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
            <div
              className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
            >
              <span>AEGIS&lt;_</span>
              <span className="h-6 w-[2px] animate-pulse bg-[#00F0FF]" />
            </div>
            <div
              className="flex items-center gap-4 text-xs uppercase tracking-wider"
              style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              <span className="text-[#00F0FF]">System Status: {status}%</span>
              <Link to="/about" className="text-white/70 transition-colors hover:text-white">About</Link>
              <Link to="/contact" className="text-white/70 transition-colors hover:text-white">Contact</Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-20 pt-12 md:px-10">
          <motion.section variants={item} className="rounded-2xl border border-white/5 bg-[#0b0b0b]/70 p-8 backdrop-blur-xl md:p-12">
            <p
              className="text-[11px] uppercase tracking-[0.24em] text-[#00F0FF]/85"
              style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              Layer 01
            </p>
            <h1
              className="mt-3 text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
            >
              Security-Core
              <br />
              Forensic Intelligence
            </h1>
            <p className="mt-5 max-w-3xl text-white/65 md:text-lg">
              A high-stakes humanitarian intelligence stack for funding risk detection, signal validation, and intervention planning.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ScrambleButton label="INITIALIZE MODEL" onClick={openModel} />
              <Link
                to="/about"
                className="rounded-lg border border-white/10 bg-[#1A1A1A]/70 px-6 py-3 text-[12px] text-white/80 transition-colors hover:border-white/25 hover:text-white"
                style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                READ SPEC
              </Link>
            </div>
          </motion.section>

          <motion.section variants={item} className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <NodeCard
              mod="MOD_01"
              title="Signal Integrity"
              body="Cross-validates conflict, food, and displacement indicators with confidence scoring and forensic traceability."
              hash="hash: b8f1-a2de-44c1"
              icon={ShieldAlert}
            />
            <NodeCard
              mod="MOD_02"
              title="Prediction Engine"
              body="Runs funding underperformance forecasts and contextual impact likelihood using operational data layers."
              hash="hash: 1a9e-0c7d-8e55"
              icon={Cpu}
            />
            <NodeCard
              mod="MOD_03"
              title="Context Fusion"
              body="Merges Intel reports, social pulse, and aid organization vectors into one analyst-first decision surface."
              hash="hash: 9fd2-7a10-ef42"
              icon={Network}
            />
          </motion.section>

          <motion.section variants={item} className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-[#0a0a0a]/70 p-5 backdrop-blur-xl">
              <p
                className="text-[10px] uppercase tracking-[0.2em] text-[#00F0FF]/85"
                style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                Pipeline
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/65">
                <li className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#00F0FF]/80" /> Ingest multi-source crisis signals</li>
                <li className="flex items-center gap-2"><ScanSearch className="h-4 w-4 text-[#00F0FF]/80" /> Detect anomalies and underfunding risk</li>
                <li className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[#00F0FF]/80" /> Surface mitigation pathways</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#0a0a0a]/70 p-5 backdrop-blur-xl">
              <p
                className="text-[10px] uppercase tracking-[0.2em] text-[#00F0FF]/85"
                style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                Micro Data
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-white/55">
                <div className="rounded-md border border-white/5 bg-[#050505]/70 p-3" style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}>latency_ms: 041</div>
                <div className="rounded-md border border-white/5 bg-[#050505]/70 p-3" style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}>trace_id: a9c3-7e2b</div>
                <div className="rounded-md border border-white/5 bg-[#050505]/70 p-3" style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}>region: global</div>
                <div className="rounded-md border border-white/5 bg-[#050505]/70 p-3" style={{ fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}>integrity: strong</div>
              </div>
            </div>
          </motion.section>
        </main>
      </motion.div>
    </div>
  );
}

