import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import ContactPanel from "../components/ContactPanel";
import DiagramPanel from "../components/DiagramPanel";
import HeroPanel from "../components/HeroPanel";
import StarField from "../components/StarField";

export default function AegisHomepage() {
  const { scrollY } = useScroll();
  // Nav fades in slightly opaque border as user scrolls
  const navBg = useTransform(scrollY, [0, 80], ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.85)"]);
  const navBorder = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0.0)", "rgba(255,255,255,0.07)"]);

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      <StarField />

      {/* ── Fixed Navigation ─────────────────────────────────────────────── */}
      <header className="aegis-nav-wrap">
        <motion.nav
          className="aegis-nav"
          style={{ background: navBg, borderColor: navBorder }}
        >
          {/* Brand */}
          <div className="aegis-brand">
            <span className="aegis-brand-icon">
              <Shield size={17} style={{ color: "#ffffff" }} />
            </span>
            <span className="aegis-brand-text">Aegis</span>
          </div>

          {/* Links */}
          <nav className="aegis-links">
            <a href="#hero">Product</a>
            <a href="#architecture">Architecture</a>
            <a href="#contact">Team</a>
          </nav>

          {/* Actions */}
          <div className="aegis-actions">
            <button
              className="aegis-cta-primary"
              style={{ padding: "9px 16px", fontSize: 14 }}
              onClick={() => { window.location.href = "http://localhost:8080"; }}
            >
              Get Started <ArrowRight size={13} />
            </button>
          </div>
        </motion.nav>
      </header>

      {/* ── Panel 1 — Hero ───────────────────────────────────────────────── */}
      <HeroPanel />

      {/* ── Panel 2 — Architecture Diagram ──────────────────────────────── */}
      <DiagramPanel />

      {/* ── Panel 3 — Contact / Team ─────────────────────────────────────── */}
      <ContactPanel />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="aegis-footer">
        <span>AEGIS · HACKLYTICS 2026 · ALL RIGHTS RESERVED</span>
      </footer>

    </div>
  );
}
