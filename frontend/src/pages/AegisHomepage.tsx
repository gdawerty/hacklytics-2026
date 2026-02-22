import { useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ContactPanel from "../components/homepage/ContactPanel";
import DiagramPanel from "../components/homepage/DiagramPanel";
import HeroPanel from "../components/homepage/HeroPanel";
import StarField from "../components/homepage/StarField";
import "../homepage-styles.css";

export default function AegisHomepage() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.85)"]);
  const navBorder = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0.0)", "rgba(255,255,255,0.07)"]);

  // The frontend's index.css sets overflow:hidden on html/body/#root for the dashboard.
  // Override it while the homepage is mounted so the page can scroll.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    html.style.overflow = "auto";
    html.style.height = "auto";
    body.style.overflow = "auto";
    body.style.height = "auto";
    if (root) {
      root.style.overflow = "auto";
      root.style.height = "auto";
    }

    return () => {
      html.style.overflow = "";
      html.style.height = "";
      body.style.overflow = "";
      body.style.height = "";
      if (root) {
        root.style.overflow = "";
        root.style.height = "";
      }
    };
  }, []);

  return (
    <div className="homepage-root" style={{ background: "#000000", minHeight: "100vh" }}>
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
              onClick={() => navigate("/dashboard")}
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
