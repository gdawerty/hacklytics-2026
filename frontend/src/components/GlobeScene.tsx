import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useLoader, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { crisisData, CrisisPoint } from "@/data/heatmapData";

const IDLE_MS = 40_000; // 40 s of no interaction → resume rotation

// ─── Helpers ──────────────────────────────────────────────────────────────

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
  );
}

function getHeatColor(intensity: number): THREE.Color {
  if (intensity < 0.33) {
    const t = intensity / 0.33;
    return new THREE.Color().setHSL((200 - 80 * t) / 360, 0.9, 0.55);
  }
  if (intensity < 0.66) {
    const t = (intensity - 0.33) / 0.33;
    return new THREE.Color().setHSL((120 - 75 * t) / 360, 0.95, 0.52);
  }
  const t = (intensity - 0.66) / 0.34;
  return new THREE.Color().setHSL((45 - 45 * t) / 360, 1.0, 0.52);
}

// ─── Crisis panel ─────────────────────────────────────────────────────────

function crisisLevel(intensity: number) {
  if (intensity > 0.74) return { label: "Critical", color: "text-red-400",     bg: "bg-red-500/20 text-red-300" };
  if (intensity > 0.49) return { label: "High",     color: "text-orange-400",  bg: "bg-orange-500/20 text-orange-300" };
  if (intensity > 0.24) return { label: "Moderate", color: "text-yellow-400",  bg: "bg-yellow-500/20 text-yellow-300" };
  return                       { label: "Low",      color: "text-emerald-400", bg: "bg-emerald-500/20 text-emerald-300" };
}

function barColor(v: number) {
  if (v > 74) return "#f87171";
  if (v > 49) return "#fb923c";
  if (v > 24) return "#facc15";
  return "#34d399";
}

function CrisisPanel({ point, onClose }: { point: CrisisPoint; onClose: () => void }) {
  const score = Math.round(point.intensity * 100);
  const level = crisisLevel(point.intensity);

  return (
    <div
      className="absolute top-1/2 right-8 -translate-y-1/2 z-30
                 w-72 rounded-2xl shadow-2xl overflow-hidden border border-white/10"
      style={{ background: "rgba(10,12,20,0.92)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <h2 className="text-white font-bold text-xl leading-tight">{point.country}</h2>
        <button onClick={onClose} className="text-white/30 hover:text-white/80 transition-colors text-lg leading-none mt-0.5">×</button>
      </div>

      <div className="px-5 pb-1">
        <div className="flex items-center gap-2.5 mb-0.5">
          <span className={`text-4xl font-bold tabular-nums ${level.color}`}>{score}%</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level.bg}`}>{level.label}</span>
        </div>
        <p className="text-white/35 text-xs tracking-wide">Underfunding Likelihood Score</p>
      </div>

      <div className="mx-5 my-4 h-px bg-white/8" />

      <div className="px-5 pb-5">
        <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-3">Contributing Factors</p>
        <div className="space-y-3">
          {point.factors.map((f) => (
            <div key={f.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm leading-none">{f.icon}</span>
                  <span className="text-white/65 text-[13px]">{f.name}</span>
                </div>
                <span className="text-white/45 text-xs tabular-nums font-mono">{f.value}%</span>
              </div>
              <div className="h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${f.value}%`, background: barColor(f.value), boxShadow: `0 0 6px ${barColor(f.value)}88` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Heat dot ─────────────────────────────────────────────────────────────

function HeatPoint({
  point, position, color, scale, onHover, onInteract,
}: {
  point:       CrisisPoint;
  position:    THREE.Vector3;
  color:       THREE.Color;
  scale:       number;
  onHover:     (p: CrisisPoint | null) => void;
  onInteract:  () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const onPointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover(point);
    document.body.style.cursor = "pointer";
  }, [point, onHover]);

  const onPointerOut = useCallback(() => {
    setHovered(false);
    onHover(null);
    document.body.style.cursor = "auto";
  }, [onHover]);

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onInteract(); // clicking a dot counts as interaction → stop rotation
  }, [onInteract]);

  return (
    <group position={position}>
      <mesh onPointerOver={onPointerOver} onPointerOut={onPointerOut} onClick={onClick}>
        <sphereGeometry args={[hovered ? scale * 1.6 : scale, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh>
        <sphereGeometry args={[hovered ? scale * 2.8 : scale * 1.8, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.45 : 0.18 + point.intensity * 0.18} />
      </mesh>

      {hovered && (
        <mesh>
          <sphereGeometry args={[scale * 1.8, 12, 12]} />
          <meshBasicMaterial color={0xffffff} wireframe opacity={0.8} transparent />
        </mesh>
      )}
    </group>
  );
}

function HeatmapPoints({ onHover, onInteract }: {
  onHover:    (p: CrisisPoint | null) => void;
  onInteract: () => void;
}) {
  const pts = useMemo(() =>
    crisisData.map((point) => ({
      point,
      position: latLngToVector3(point.lat, point.lng, 2.03),
      color:    getHeatColor(point.intensity),
      scale:    0.02 + point.intensity * 0.04,
    }))
  , []);

  return (
    <>
      {pts.map((d, i) => (
        <HeatPoint key={i} {...d} onHover={onHover} onInteract={onInteract} />
      ))}
    </>
  );
}

function Globe({ onHover, onInteract }: {
  onHover:    (p: CrisisPoint | null) => void;
  onInteract: () => void;
}) {
  const texture = useLoader(THREE.TextureLoader, "/images/earth-texture.jpg");
  
  // Enhance texture quality
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  return (
    <group>
      <Sphere args={[2, 128, 128]}>
        <meshPhongMaterial 
          map={texture}
          shininess={5}
          emissive={0x111111}
        />
      </Sphere>
      <HeatmapPoints onHover={onHover} onInteract={onInteract} />
    </group>
  );
}

function Atmosphere() {
  return (
    <Sphere args={[2.18, 48, 48]}>
      <meshBasicMaterial color="hsl(210,80%,60%)" transparent opacity={0.04} side={THREE.BackSide} />
    </Sphere>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export default function GlobeScene() {
  const [hovered,    setHovered]    = useState<CrisisPoint | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Called on any user interaction — stops rotation and arms the 40s idle timer
  const handleInteraction = useCallback(() => {
    setAutoRotate(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAutoRotate(true), IDLE_MS);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={1.2}
          castShadow
        />
        <directionalLight 
          position={[-2, -2, -5]} 
          intensity={0.3}
          color={0x4a90ff}
        />
        <Globe onHover={setHovered} onInteract={handleInteraction} />
        <Atmosphere />
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={3.5}
          maxDistance={8}
          autoRotate={autoRotate}
          autoRotateSpeed={0.4}
          onStart={handleInteraction}   // drag/click starts → stop rotation + reset timer
        />
      </Canvas>

      {hovered && <CrisisPanel point={hovered} onClose={() => setHovered(null)} />}
    </div>
  );
}
