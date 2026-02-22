import { motion, useInView } from "framer-motion";
import { Github, Linkedin } from "lucide-react";
import { useRef } from "react";

/* ─── IEEE SVG icon ─────────────────────────────────────────────────────── */
function IEEEIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

/* ─── Team member data ──────────────────────────────────────────────────── */
const TEAM = [
  {
    initials: "PS",
    name: "Pratham Saurabh",
    uni: "Georgia Institute of Technology",
    github: "https://github.com/prathamsaurabh",
    linkedin: "https://www.linkedin.com/in/pratham-saurabh",
    ieee: true,
    lead: true,
  },
  {
    initials: "AM",
    name: "Alex Mathai",
    uni: "Georgia Institute of Technology",
    github: "https://github.com/amathai05",
    linkedin: "https://www.linkedin.com/in/alex-mathai1/",
    lead: false,
  },
  {
    initials: "SD",
    name: "Sarthak Das",
    uni: "Georgia Institute of Technology",
    github: "https://github.com/Skenix64",
    linkedin: "https://www.linkedin.com/in/sarthak-das19/",
    lead: false,
  },
  {
    initials: "AL",
    name: "Aaron Lu",
    uni: "Georgia Institute of Technology",
    github: "https://github.com/gdawerty",
    linkedin: "https://www.linkedin.com/in/aaron-luu123/",
    lead: false,
  },
] as const;

/* ─── Individual team card ──────────────────────────────────────────────── */
function TeamCard({ member, delay }: { member: (typeof TEAM)[number]; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={`team-card${member.lead ? " lead" : ""}`}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="team-avatar">{member.initials}</div>
      <div className="team-name">{member.name}</div>
      <div className="team-uni">{member.uni}</div>

      <div className="team-socials">
        <a className="social-chip" href={member.github} target="_blank" rel="noreferrer">
          <Github size={13} />
          GitHub
        </a>
        <a className="social-chip" href={member.linkedin} target="_blank" rel="noreferrer">
          <Linkedin size={13} />
          LinkedIn
        </a>
        {"ieee" in member && member.ieee && (
          <span className="social-chip ieee-badge">
            <IEEEIcon />
            IEEE Member
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main ContactPanel ─────────────────────────────────────────────────── */
export default function ContactPanel() {
  const headerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section id="contact" className="contact-panel">
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>

        {/* Header */}
        <div ref={headerRef} style={{ marginBottom: 60 }}>
          <motion.div
            className="section-label"
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            STRATEGIC NETWORK
          </motion.div>
          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            The Team
          </motion.h2>
          <motion.p
            className="section-sub"
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.16 }}
          >
            Built by researchers and engineers at Georgia Tech — at the
            intersection of machine learning, geopolitical intelligence, and
            crisis response.
          </motion.p>
        </div>

        {/* 2×2 team grid */}
        <div className="team-grid">
          {TEAM.map((member, i) => (
            <TeamCard key={member.name} member={member} delay={i * 0.08} />
          ))}
        </div>

        {/* Footer line */}
        <motion.div
          style={{
            marginTop: 52,
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.28)",
            letterSpacing: "0.06em",
            display: "flex",
            gap: 28,
            flexWrap: "wrap",
          }}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <span>// HACKLYTICS 2026</span>
          <span>// GEORGIA INSTITUTE OF TECHNOLOGY</span>
          <span>// ALL INTELLIGENCE SESSIONS ENCRYPTED</span>
        </motion.div>
      </div>
    </section>
  );
}
