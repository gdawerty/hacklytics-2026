import { Link } from "react-router-dom";
import StarfieldCanvas from "@/components/StarfieldCanvas";

export default function About() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <StarfieldCanvas />
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-8 md:px-10">
        <header className="mb-8 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-5 py-3 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold text-white">About Aegis</h1>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/75 hover:text-white hover:border-white/25 transition-colors">
              Home
            </Link>
            <Link to="/contact" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/75 hover:text-white hover:border-white/25 transition-colors">
              Contact
            </Link>
            <Link to="/dashboard" className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20 transition-colors">
              Open Model
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-cyan-300/75">Mission</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">Decision support for humanitarian response.</h2>
          <p className="mt-4 max-w-3xl text-white/65 leading-relaxed">
            Aegis is a crisis-intelligence platform for identifying risk patterns, monitoring funding gaps, and surfacing intervention context in one operational view.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
            <h3 className="text-white font-semibold">What We Analyze</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/65">
              <li>Conflict, displacement, and protection pressure</li>
              <li>Food, WASH, health, and education strain</li>
              <li>Funding needs versus real-time support levels</li>
              <li>Country and regional intelligence context</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
            <h3 className="text-white font-semibold">Technology Stack</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/65">
              <li>Interactive globe visualization</li>
              <li>LLM-assisted intelligence enrichment (Groq)</li>
              <li>Funding prediction pipeline (Databricks)</li>
              <li>Operational UI for analysts and decision teams</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
