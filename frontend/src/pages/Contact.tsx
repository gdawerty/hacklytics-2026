import { Link } from "react-router-dom";
import StarfieldCanvas from "@/components/StarfieldCanvas";

export default function Contact() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <StarfieldCanvas />
      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-8 md:px-10">
        <header className="mb-8 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-5 py-3 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold text-white">Contact</h1>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/75 hover:text-white hover:border-white/25 transition-colors">
              Home
            </Link>
            <Link to="/about" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/75 hover:text-white hover:border-white/25 transition-colors">
              About
            </Link>
            <Link to="/dashboard" className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20 transition-colors">
              Open Model
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-cyan-300/75">Get In Touch</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">Partner, demo, or collaboration inquiries.</h2>
          <p className="mt-4 text-white/65 leading-relaxed">
            Use the channels below to connect with the Aegis team. You can start with email and add your own integrations or form handling next.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <a
              href="mailto:team@aegis-dashboard.org"
              className="rounded-xl border border-white/10 bg-slate-950/45 p-5 hover:border-cyan-300/35 transition-colors"
            >
              <p className="text-white font-semibold">Email</p>
              <p className="mt-2 text-sm text-cyan-200">team@aegis-dashboard.org</p>
              <p className="mt-2 text-sm text-white/55">General inquiries, demos, and partnership outreach.</p>
            </a>
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-5">
              <p className="text-white font-semibold">Response Time</p>
              <p className="mt-2 text-sm text-white/65">Typical reply window: within 24 hours on business days.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

