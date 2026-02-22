import { motion, useInView } from "framer-motion";
import {
  Globe2,
  Target,
  Newspaper,
  BrainCircuit,
  Milestone,
  ArrowRight,
} from "lucide-react";
import { useRef } from "react";

/* ─── SVG Connector with draw + flowing dot ────────────────────────────── */
function DrawConnector({ height = 52, color = "rgba(125,154,142,0.55)" }: { height?: number; color?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "0 auto", width: 40 }}>
      <svg ref={ref} width="2" height={height} viewBox={`0 0 2 ${height}`} fill="none" overflow="visible">
        {/* Static line that draws in */}
        <motion.line
          x1="1" y1="0" x2="1" y2={height}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray={height}
          strokeDashoffset={height}
          animate={inView ? { strokeDashoffset: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        {/* End dot */}
        <motion.circle
          cx="1" cy={height} r="3"
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ delay: 0.65, duration: 0.2 }}
        />
        {/* Traveling glow dot — loops continuously after draw */}
        {inView && (
          <motion.circle
            cx="1"
            r="3"
            fill="rgba(161,205,185,0.95)"
            style={{ filter: "drop-shadow(0 0 4px rgba(125,154,142,0.9))" }}
            initial={{ cy: 0, opacity: 0 }}
            animate={{
              cy:      [0, height, height],
              opacity: [0, 1,      0],
            }}
            transition={{
              duration:    1.1,
              delay:       1.0,
              ease:        "linear",
              repeat:      Infinity,
              repeatDelay: 1.8,
            }}
          />
        )}
      </svg>
    </div>
  );
}

/* ─── Flow node wrapper ─────────────────────────────────────────────────── */
function FlowNode({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className="flow-node"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Main DiagramPanel ─────────────────────────────────────────────────── */
export default function DiagramPanel() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true });

  const parallelRef = useRef<HTMLDivElement>(null);
  const parallelInView = useInView(parallelRef, { once: true, margin: "-60px" });

  return (
    <section id="architecture" className="diagram-panel">
      {/* Header */}
      <div ref={headerRef} style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 72px" }}>
        <motion.div
          className="section-label"
          initial={{ opacity: 0, y: 12 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          INTELLIGENCE ARCHITECTURE
        </motion.div>
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 18 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          Forensic Flow
        </motion.h2>
        <motion.p
          className="section-sub"
          style={{ margin: "0 auto" }}
          initial={{ opacity: 0, y: 14 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.2 }}
        >
          A vertically integrated pipeline — from geospatial selection to
          actionable strategic output — executing in real time.
        </motion.p>
      </div>

      {/* Flow */}
      <div className="flow-container">

        {/* Node 1 — Global Selection */}
        <FlowNode>
          <div className="flow-node-header">
            <div className="flow-node-icon"><Globe2 size={18} /></div>
            <div>
              <div className="flow-node-num">NODE 01</div>
              <div className="flow-node-title">Global Selection</div>
            </div>
          </div>
          <p className="flow-node-desc">
            Choose any region, country, or conflict zone from the interactive
            geospatial interface. Aegis immediately initialises a live
            intelligence session for the selected target.
          </p>
          <div className="flow-node-tags">
            <span className="flow-tag">Interactive Globe</span>
            <span className="flow-tag">Region Targeting</span>
            <span className="flow-tag">Multi-country</span>
          </div>
        </FlowNode>

        <DrawConnector />

        {/* Node 2 — Targeting & Extraction */}
        <FlowNode delay={0.05}>
          <div className="flow-node-header">
            <div className="flow-node-icon"><Target size={18} /></div>
            <div>
              <div className="flow-node-num">NODE 02</div>
              <div className="flow-node-title">Targeting & Extraction</div>
            </div>
          </div>
          <p className="flow-node-desc">
            Four concurrent data pipelines activate simultaneously, each
            independently feeding the downstream analysis engines.
          </p>
          <div className="flow-node-tags">
            <span className="flow-tag">Overview Synthesis</span>
            <span className="flow-tag">Aid Database</span>
            <span className="flow-tag">Intelligence Feeds</span>
            <span className="flow-tag">Social Scraping</span>
          </div>
        </FlowNode>

        <DrawConnector />

        {/* Node 3 — Dual-track */}
        <div ref={parallelRef} style={{ width: "100%" }}>
          <motion.div
            style={{
              textAlign: "center",
              marginBottom: 18,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "rgba(125,154,142,0.5)",
            }}
            initial={{ opacity: 0 }}
            animate={parallelInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
          >
            NODE 03 — PARALLEL ANALYSIS
          </motion.div>

          <div className="flow-parallel">
            {/* Track A — Geopolitical Intel */}
            <motion.div
              className="flow-track track-a"
              initial={{ opacity: 0, y: 24 }}
              animate={parallelInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="track-label">TRACK A</div>
              <div className="flow-node-header" style={{ marginBottom: 8 }}>
                <div className="flow-node-icon" style={{ width: 34, height: 34 }}>
                  <Newspaper size={16} />
                </div>
                <div className="track-title">Geopolitical Intel</div>
              </div>
              <p className="track-desc">
                Real-time web scraping of news articles and strategic overviews
                to surface actionable geopolitical signals for the target region.
              </p>
              <div className="flow-node-tags" style={{ marginTop: 12 }}>
                <span className="flow-tag">Web Scraping</span>
                <span className="flow-tag">News APIs</span>
                <span className="flow-tag">Intel Feeds</span>
              </div>
              <div className="track-feed-arrow">
                <span>OUTPUT FEEDS ML MODEL</span>
                <ArrowRight size={11} />
              </div>
            </motion.div>

            {/* Track B — ML Aid Prediction */}
            <motion.div
              className="flow-track track-a"
              initial={{ opacity: 0, y: 24 }}
              animate={parallelInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="track-label">TRACK B — USES TRACK A OUTPUT</div>
              <div className="flow-node-header" style={{ marginBottom: 8 }}>
                <div className="flow-node-icon" style={{ width: 34, height: 34 }}>
                  <BrainCircuit size={16} />
                </div>
                <div className="track-title">ML Aid Prediction</div>
              </div>
              <p className="track-desc">
                Ingests Geopolitical Intel output + raw aid data to predict
                underfunded crises by analysing Money Received vs. Money Needed.
              </p>
              <div className="flow-node-tags" style={{ marginTop: 12 }}>
                <span className="flow-tag">Databricks</span>
                <span className="flow-tag">Machine Learning</span>
                <span className="flow-tag">Data Science</span>
                <span className="flow-tag">Groq</span>
              </div>
            </motion.div>
          </div>
        </div>

        <DrawConnector />

        {/* Node 4 — Strategic Output */}
        <FlowNode delay={0.05}>
          <div className="flow-node-header">
            <div className="flow-node-icon" style={{ background: "rgba(125,154,142,0.22)", borderColor: "rgba(125,154,142,0.5)" }}>
              <Milestone size={18} style={{ color: "rgba(161,205,185,1)" }} />
            </div>
            <div>
              <div className="flow-node-num">NODE 04 — OUTPUT</div>
              <div className="flow-node-title" style={{ color: "rgba(161,205,185,0.95)" }}>
                Strategic Mitigation Plan
              </div>
            </div>
          </div>
          <p className="flow-node-desc">
            A structured, step-by-step actionable plan delivered as a forensic
            brief — covering diplomatic levers, aid mobilisation priorities,
            and risk-ranked intervention strategies.
          </p>
          <div className="flow-node-tags">
            <span className="flow-tag">Diplomatic Actions</span>
            <span className="flow-tag">Aid Mobilisation</span>
            <span className="flow-tag">Risk Ranking</span>
            <span className="flow-tag">Exportable Brief</span>
          </div>
        </FlowNode>

      </div>
    </section>
  );
}
