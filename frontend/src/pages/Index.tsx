import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import StarfieldCanvas from "@/components/StarfieldCanvas";

export default function Index() {
  const navigate = useNavigate();
  const handleGetStarted = () => {
    sessionStorage.setItem("showAegisIntro", "1");
    navigate("/dashboard");
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <StarfieldCanvas />

      <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-10 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
            className="text-5xl font-bold tracking-tight text-white md:text-6xl"
          >
            Aegis
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.35, ease: "easeOut" }}
            className="mt-4 text-sm text-white/55"
          >
            Predictive signal intelligence for funding gaps and mitigation outcomes.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.66 }}
            onClick={handleGetStarted}
            className="mt-8 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-8 py-3 text-sm font-semibold text-cyan-200 transition-all hover:bg-cyan-500/20 hover:border-cyan-300/60"
          >
            Get Started
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
