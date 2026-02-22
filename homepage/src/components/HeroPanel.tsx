import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeroGlobe from "./HeroGlobe";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HeroPanel() {
  const navigate = useNavigate();

  return (
    <section id="hero" className="hero-panel">
      {/* Radial ambient glow */}
      <div className="hero-radial" />

      {/* Interactive 3D globe background */}
      <div className="globe-wrapper">
        <HeroGlobe />
      </div>

      {/* Content */}
      <div className="hero-content">
        {/* Status pill */}
        <motion.div
          className="hero-pill"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.1}
        >
          <ShieldCheck size={13} style={{ color: "var(--sage)" }} />
          <span>OPERATIONALLY LIVE</span>
          <span className="pulse-dot" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="hero-title"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.28}
        >
          Crisis Intelligence,
          <br />
          <span className="word-verified">Verified.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          className="hero-subtitle"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.46}
        >
          The enterprise-grade intelligence suite for global crisis prediction
          and mitigation.{" "}
          <span style={{ color: "var(--sage-light)", fontWeight: 600 }}>
            Aegis access is live.
          </span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="hero-ctas"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.62}
        >
          <button
            className="aegis-cta-primary"
            onClick={() => navigate("/dashboard")}
          >
            Get Started <ArrowRight size={15} />
          </button>
          <a className="aegis-cta-secondary" href="#architecture">
            See How It Works <ChevronDown size={15} />
          </a>
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <motion.a
        href="#architecture"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          color: "rgba(255,255,255,0.3)",
          textDecoration: "none",
          zIndex: 4,
        }}
      >
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.12em" }}>
          SCROLL
        </span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </motion.a>
    </section>
  );
}
