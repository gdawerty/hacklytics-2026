import { Link } from "react-router-dom";
import StarfieldCanvas from "@/components/StarfieldCanvas";

export default function About() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <StarfieldCanvas />
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-8 md:px-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-5 py-3 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-300/70">Aegis</p>
            <h1 className="text-2xl font-semibold text-white">About</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20 transition-colors">
              Open Model
            </Link>
            <Link to="/contact" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/75 hover:text-white hover:border-white/25 transition-colors">
              Contact
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-cyan-300/75">Synopsis</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">Aegis - Humanitarian Intelligence</h2>
          <p className="mt-4 max-w-4xl text-white/70 leading-relaxed">
            Aegis is a decision-support platform for humanitarian risk analysis. It combines crisis indicators,
            funding predictions, field context, and live intelligence signals into one operational surface so teams
            can identify priority gaps faster and coordinate interventions with higher confidence.
          </p>
          <p className="mt-3 max-w-4xl text-white/60 leading-relaxed">
            The system is built for analysts, responders, and donors who need an evidence-backed view of where aid
            is most needed, what mitigation strategy is likely to work, and which data signals matter right now.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
            <h3 className="text-white font-semibold">Core Capabilities</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/65">
              <li>Country-level crisis monitoring and prioritization</li>
              <li>Databricks underfunding prediction integration</li>
              <li>LLM-backed intel synthesis and context generation</li>
              <li>Aid planning and sector-level gap analysis</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
            <h3 className="text-white font-semibold">Built For</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/65">
              <li>Humanitarian operations and response teams</li>
              <li>Policy and NGO strategy groups</li>
              <li>Funding allocation and donor review workflows</li>
              <li>Cross-functional crisis intelligence collaboration</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
