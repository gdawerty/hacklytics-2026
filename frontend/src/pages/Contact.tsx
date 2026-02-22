import { Link } from "react-router-dom";
import StarfieldCanvas from "@/components/StarfieldCanvas";

export default function Contact() {
  const members = [
    {
      name: "Pratham Saurabh",
      url: "https://www.linkedin.com/in/pratham-saurabh/",
    },
    {
      name: "Alex Mathai",
      url: "https://www.linkedin.com/in/alex-mathai1/",
    },
    {
      name: "Sarthak Das",
      url: "https://www.linkedin.com/in/sarthak-das19/",
    },
    {
      name: "Aaron Lu",
      url: "https://www.linkedin.com/in/aaron-luu123/",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <StarfieldCanvas />
      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-8 md:px-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-5 py-3 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-300/70">Aegis Team</p>
            <h1 className="text-2xl font-semibold text-white">Contact</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20 transition-colors">
              Open Model
            </Link>
            <Link to="/about" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/75 hover:text-white hover:border-white/25 transition-colors">
              About
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-cyan-300/75">Team Profiles</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">Connect with the builders</h2>
          <p className="mt-4 text-white/65 leading-relaxed">
            Reach out on LinkedIn for collaboration, technical discussion, or project inquiries.
          </p>

          <div className="mt-6 grid gap-3">
            {members.map((m) => (
              <a
                key={m.name}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 transition-colors hover:border-cyan-300/40 hover:bg-slate-900/60"
              >
                <div>
                  <p className="text-white font-semibold">{m.name}</p>
                  <p className="text-[11px] font-mono text-cyan-300/70">linkedin.com</p>
                </div>
                <span className="text-sm text-white/35 group-hover:text-cyan-200 transition-colors">↗</span>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
