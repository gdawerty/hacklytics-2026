import { Suspense } from "react";
import { motion } from "framer-motion";
import AboutGlobeBackground from "@/components/AboutGlobeBackground";
import { NavLink } from "@/components/NavLink";

export default function About() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Animated globe background with error nodes */}
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading globe…
          </div>
        }
      >
        <AboutGlobeBackground />
      </Suspense>

      {/* Navigation */}
      <NavLink to="/" className="absolute top-8 left-8 z-20">
        ← Back to Map
      </NavLink>

      {/* Text content overlay with blur and semi-transparency */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main content card */}
        <motion.div
          className="pointer-events-auto bg-background/60 border border-cyan-500/30 rounded-lg p-12 max-w-2xl shadow-2xl"
          variants={itemVariants}
          whileHover={{ boxShadow: "0 0 20px rgba(34, 211, 238, 0.3)" }}
        >
          {/* Title */}
          <motion.h1
            className="text-4xl font-bold tracking-tight text-foreground mb-6"
            variants={itemVariants}
          >
            About Hacklytics
          </motion.h1>

          {/* Mission */}
          <motion.div className="mb-6" variants={itemVariants}>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              Hacklytics is a humanitarian crisis prediction system designed to identify and forecast 
              global humanitarian emergencies. By analyzing real-time data and patterns, we help 
              organizations prepare and respond to crises before they escalate.
            </p>
          </motion.div>

          {/* How it Works */}
          <motion.div className="mb-6" variants={itemVariants}>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">How It Works</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our system monitors crisis indicators across multiple sectors—health, water, food security, 
              and displacement patterns. The globe behind this overlay highlights active crisis zones, 
              while animated error nodes represent key areas of concern. Each node is analyzed for operational 
              capacity, sector gaps, and trending underfunding.
            </p>
          </motion.div>

          {/* Technology */}
          <motion.div className="mb-6" variants={itemVariants}>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">Technology Stack</h2>
            <ul className="text-muted-foreground leading-relaxed space-y-2">
              <li>• <span className="text-cyan-300">Globe Visualization:</span> React Globe GL with real-time data projection</li>
              <li>• <span className="text-cyan-300">AI Analysis:</span> Groq Llama-3.3-70b for intelligent crisis assessment</li>
              <li>• <span className="text-cyan-300">Weather Data:</span> Open-Meteo for regional environmental context</li>
              <li>• <span className="text-cyan-300">Animations:</span> Framer Motion for smooth, responsive UI transitions</li>
            </ul>
          </motion.div>

          {/* CTA */}
          <motion.div className="mt-8" variants={itemVariants}>
            <p className="text-sm text-muted-foreground italic">
              Explore the map to view crisis predictions and detailed intelligence dossiers for each region.
            </p>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Floating accents */}
      <motion.div
        className="absolute top-20 right-20 w-32 h-32 rounded-full border border-cyan-500/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute bottom-20 left-20 w-24 h-24 rounded-full border border-cyan-500/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
