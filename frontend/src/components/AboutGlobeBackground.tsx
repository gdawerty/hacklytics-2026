import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Globe, { GlobeMethods } from "react-globe.gl";
import { CrisisPoint, crisisData } from "@/data/heatmapData";

interface ErrorNode {
  id: string;
  lat: number;
  lng: number;
  size: number;
  crisis: CrisisPoint;
}

const AboutGlobeBackground = () => {
  const globeEl = useRef<GlobeMethods>(null);
  const [errorNodes, setErrorNodes] = useState<ErrorNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Initialize error nodes from crisis data
  useEffect(() => {
    const nodes: ErrorNode[] = crisisData.map((crisis, idx) => ({
      id: `node-${idx}`,
      lat: crisis.lat,
      lng: crisis.lng,
      size: 0.4 + crisis.intensity * 0.6,
      crisis,
    }));
    setErrorNodes(nodes);
  }, []);

  // Rotate globe continuously
  useEffect(() => {
    if (!globeEl.current) return;
    let rotation = 0;
    const interval = setInterval(() => {
      rotation += 0.1;
      globeEl.current?.rotateZ(rotation);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Cycle through error nodes with animation
  useEffect(() => {
    if (errorNodes.length === 0) return;
    let currentIdx = 0;

    const cycleInterval = setInterval(() => {
      const node = errorNodes[currentIdx];
      setActiveNodeId(node.id);

      // Point to the node
      if (globeEl.current) {
        globeEl.current.pointOfView({
          lat: node.lat,
          lng: node.lng,
          altitude: 1.2,
        }, 1200);
      }

      // Disappear after 2.5 seconds
      setTimeout(() => {
        setActiveNodeId(null);
      }, 2500);

      currentIdx = (currentIdx + 1) % errorNodes.length;
    }, 4000); // Cycle every 4 seconds

    return () => clearInterval(cycleInterval);
  }, [errorNodes]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Globe background */}
      <Globe
        ref={globeEl}
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg"
        backgroundColor="rgba(0, 0, 0, 0)"
        showAtmosphere={true}
        atmosphereColor="#22d3ee"
        atmosphereAltitude={0.15}
        pointsData={errorNodes}
        pointAltitude={() => 0}
        pointColor={(node: any) => {
          if (node.id === activeNodeId) {
            return "rgba(34, 211, 238, 1)"; // Bright cyan when active
          }
          return "rgba(34, 211, 238, 0.95)"; // Nearly full opacity
        }}
        pointSize={(node: any) => {
          if (node.id === activeNodeId) {
            return node.size * 3; // Much larger when active
          }
          return node.size * 2.5; // Much larger base size
        }}
        pointResolution={8}
        pointLabel={(node: any) => node.crisis.country}
        onPointClick={(node: any) => {
          setActiveNodeId(node.id);
        }}
      />

      {/* Pointer/annotation for active node */}
      {activeNodeId && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Pulsing rings around active node */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
        </motion.div>
      )}

      {/* Lighter blur overlay for better visibility */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/10" />
    </div>
  );
};

export default AboutGlobeBackground;
