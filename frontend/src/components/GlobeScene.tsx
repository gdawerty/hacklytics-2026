import { useRef, useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { crisisData, CrisisPoint } from "@/data/heatmapData";
import { IntelligenceDossier } from "./IntelligenceDossier";

const IDLE_MS = 40_000;
const STAR_COUNT = 14_000;
const STAR_NEAR = 260;
const STAR_FAR = 2200;
const STAR_PARALLAX = 0.1;
const LAND_BASE = "55,110,55"; // realistic land tint

// ─── Name mapping: crisis data → GeoJSON names ────────────────────────────
const NAME_MAP: Record<string, string> = {
  "DR Congo":       "Democratic Republic of the Congo",
  "United States":  "USA",
  "United Kingdom": "England",
};

const COUNTRY_LABEL_MAP: Record<string, string> = {
  "West Bank": "Palestine",
  "State of Palestine": "Palestine",
  "PSE": "Palestine",
};

function normalizeCountryName(name: string): string {
  return COUNTRY_LABEL_MAP[name] ?? name;
}

const crisisMap = new Map<string, CrisisPoint>();
for (const d of crisisData) {
  const mapped = normalizeCountryName(NAME_MAP[d.country] ?? d.country);
  crisisMap.set(mapped, d);
}

const REVERSE: Record<string, string> = {
  "Democratic Republic of the Congo": "DR Congo",
  "USA":     "United States",
  "England": "United Kingdom",
};

// ─── Geo helpers ───────────────────────────────────────────────────────────
interface BBox { minLat: number; maxLat: number; minLng: number; maxLng: number }

function getFeatureBBox(feat: object): BBox {
  const geom = (feat as any).geometry;
  const lats: number[] = [];
  const lngs: number[] = [];
  function scan(coords: number[][]) {
    for (const [lng, lat] of coords) { lats.push(lat); lngs.push(lng); }
  }
  if (geom.type === "Polygon")      scan(geom.coordinates[0]);
  else if (geom.type === "MultiPolygon")
    for (const poly of geom.coordinates) scan(poly[0]);
  return {
    minLat: Math.min(...lats), maxLat: Math.max(...lats),
    minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
  };
}

function bboxAltitude(bbox: BBox): number {
  const span = Math.max(bbox.maxLat - bbox.minLat, bbox.maxLng - bbox.minLng);
  return Math.max(0.25, Math.min(1.6, span / 38));
}

// ─── Neon cyan palette ─────────────────────────────────────────────────────
const CYAN = "34,211,238"; // #22d3ee

// ─── Country color helpers ─────────────────────────────────────────────────
function getCapColor(feat: object, isHovered: boolean, isSelected: boolean, hasSelection: boolean): string {
  const name = (feat as any).properties?.name ?? "";
  void name; // unused until heat data is re-enabled

  if (hasSelection) {
    if (isSelected) return `rgba(${LAND_BASE},0.80)`;
    return "rgba(0,0,0,0)";
  }

  if (isHovered) return `rgba(${LAND_BASE},0.62)`;
  return `rgba(${LAND_BASE},0.46)`;
}

function getStrokeColor(feat: object, isHovered: boolean, isSelected: boolean, hasSelection: boolean): string {
  void feat;
  if (isSelected)   return `rgba(${CYAN},0.95)`;
  if (hasSelection) return "rgba(255,255,255,0.12)";
  if (isHovered)    return `rgba(${CYAN},0.80)`;
  return "rgba(57, 107, 153, 0.06)";
}

function getAltitude(isHovered: boolean, isSelected: boolean): number {
  if (isSelected) return 0.003;
  if (isHovered)  return 0.016;
  return 0.004;
}

// ─── Root ─────────────────────────────────────────────────────────────────
interface GlobeSceneProps {
  onSelectionChange?: (selected: boolean) => void;
}

export default function GlobeScene({ onSelectionChange }: GlobeSceneProps) {
  const globeRef     = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const starfieldRef = useRef<THREE.Points | null>(null);
  const sceneInitRef = useRef(false);

  const [countries,       setCountries]       = useState<object[]>([]);
  const [hoveredFeature,  setHoveredFeature]  = useState<object | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<object | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const [dossier, setDossier] = useState<{
    country: string;
    crisis:  CrisisPoint | null;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [dims, setDims] = useState({ w: 900, h: 700 });

  // Container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.round(width), h: Math.round(height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Load countries GeoJSON
  useEffect(() => {
    fetch("/data/countries.geojson")
      .then(r => r.json())
      .then(data => setCountries(data.features));
  }, []);

  const syncStarfieldToGlobe = useCallback(() => {
    if (!globeRef.current || !starfieldRef.current) return;
    const pov = globeRef.current.pointOfView() as { lat?: number; lng?: number };
    const lat = pov.lat ?? 0;
    const lng = pov.lng ?? 0;

    // Keep the star volume centered around the camera so space feels unbounded.
    const cam = globeRef.current.camera() as THREE.Camera;
    starfieldRef.current.position.copy(cam.position);

    starfieldRef.current.rotation.x = THREE.MathUtils.degToRad(lat * STAR_PARALLAX);
    starfieldRef.current.rotation.y = THREE.MathUtils.degToRad(lng * STAR_PARALLAX);
  }, []);

  const applyMatteMaterials = useCallback(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene() as THREE.Scene;
    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat: THREE.Material) => {
        const phong = mat as THREE.MeshPhongMaterial;
        const standard = mat as THREE.MeshStandardMaterial;
        if ("shininess" in phong) phong.shininess = 0;
        if ("specular" in phong) phong.specular.setRGB(0, 0, 0);
        if ("roughness" in standard) standard.roughness = 1;
        if ("metalness" in standard) standard.metalness = 0;
        mat.depthTest = true;
        mat.needsUpdate = true;
      });
    });
  }, []);

  const configureTacticalLighting = useCallback(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene() as THREE.Scene;
    const lights: THREE.Light[] = [];
    scene.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Light).isLight) lights.push(obj as THREE.Light);
    });
    lights.forEach(light => scene.remove(light));
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const directional = new THREE.DirectionalLight(0xffffff, 1.0);
    directional.position.set(120, 80, 100);
    scene.add(directional);
  }, []);

  const applyOceanTone = useCallback(() => {
    if (!globeRef.current) return;
    const material = (globeRef.current as any).globeMaterial?.() as THREE.MeshPhongMaterial | undefined;
    if (!material) return;
    material.map = null;
    material.specularMap = null;
    material.bumpMap = null;
    material.normalMap = null;
    material.emissiveMap = null;
    material.color = new THREE.Color("#1d5fa8");
    material.emissive = new THREE.Color("#1b4f93");
    material.emissiveIntensity = 0.35;
    material.shininess = 0;
    material.specular = new THREE.Color("#163c6d");
    material.needsUpdate = true;
  }, []);

  const createStarfield = useCallback(() => {
    if (!globeRef.current || starfieldRef.current) return;
    const scene = globeRef.current.scene() as THREE.Scene;
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = STAR_NEAR + Math.random() * (STAR_FAR - STAR_NEAR);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 1.0,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      depthTest: true,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    starfieldRef.current = points;
    syncStarfieldToGlobe();
  }, [syncStarfieldToGlobe]);

  // Auto-rotate init
  const onGlobeReady = useCallback(() => {
    if (!globeRef.current || sceneInitRef.current) return;
    sceneInitRef.current = true;
    const cam = globeRef.current.camera() as THREE.PerspectiveCamera;
    cam.near = 0.1;
    cam.far = 10000;
    cam.updateProjectionMatrix();
    const ctrl = globeRef.current.controls() as any;
    ctrl.autoRotate      = true;
    ctrl.autoRotateSpeed = 0.4;
    ctrl.minDistance = 140;
    ctrl.maxDistance = 430;
    globeRef.current.pointOfView({ lat: 12, lng: 18, altitude: 2.2 }, 0);
    
    // Configure renderer for proper depth and render ordering
    const renderer = (globeRef.current as any).renderer?.() as THREE.WebGLRenderer | undefined;
    if (renderer) {
      renderer.sortObjects = true;
    }
    
    setTimeout(() => {
      configureTacticalLighting();
      applyMatteMaterials();
      applyOceanTone();
      createStarfield();
    }, 0);
  }, [applyMatteMaterials, applyOceanTone, configureTacticalLighting, createStarfield]);

  // Stop rotation + arm idle timer
  const handleInteraction = useCallback(() => {
    if (globeRef.current) (globeRef.current.controls() as any).autoRotate = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!selectedFeature && globeRef.current) {
        (globeRef.current.controls() as any).autoRotate = true;
      }
    }, IDLE_MS);
  }, [selectedFeature]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      syncStarfieldToGlobe();
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [syncStarfieldToGlobe]);

  useEffect(() => {
    return () => {
      if (!globeRef.current) return;
      const scene = globeRef.current.scene() as THREE.Scene;
      if (starfieldRef.current) {
        scene.remove(starfieldRef.current);
        starfieldRef.current.geometry.dispose();
        (starfieldRef.current.material as THREE.Material).dispose();
        starfieldRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    applyOceanTone();
    const t1 = window.setTimeout(() => applyOceanTone(), 90);
    const t2 = window.setTimeout(() => applyOceanTone(), 260);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [applyOceanTone, selectedFeature, isDashboardOpen, dims.w, dims.h]);

  // Back → world view
  const handleBack = useCallback(() => {
    setIsDashboardOpen(false);
    setSelectedFeature(null);
    setDossier(null);
    onSelectionChange?.(false);
    globeRef.current?.pointOfView({ lat: 12, lng: 18, altitude: 2.5 }, 1000);
    handleInteraction();
  }, [handleInteraction, onSelectionChange]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && selectedFeature) handleBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBack, selectedFeature]);

  // Country click → zoom + dossier
  const handlePolygonClick = useCallback((feat: object) => {
    handleInteraction();
    if (feat === selectedFeature) { handleBack(); return; }

    const bbox = getFeatureBBox(feat);
    const lat  = (bbox.minLat + bbox.maxLat) / 2;
    const lng  = (bbox.minLng + bbox.maxLng) / 2;
    const alt  = bboxAltitude(bbox);
    globeRef.current?.pointOfView({ lat, lng, altitude: alt }, 850);

    setSelectedFeature(feat);
    setIsDashboardOpen(true);
    onSelectionChange?.(true);

    const rawName     = (feat as any).properties?.name ?? "";
    const geoName     = normalizeCountryName(rawName);
    const crisis      = crisisMap.get(geoName) ?? crisisMap.get(rawName) ?? null;
    const displayName = normalizeCountryName(REVERSE[geoName] ?? REVERSE[rawName] ?? geoName);
    setDossier({ country: displayName, crisis });
  }, [handleInteraction, handleBack, onSelectionChange, selectedFeature]);

  // Click blank globe → close
  const handleGlobeClick = useCallback(() => {
    if (selectedFeature) handleBack();
  }, [selectedFeature, handleBack]);

  const handlePolygonHover = useCallback((feat: object | null) => {
    setHoveredFeature(feat);
  }, []);

  const hasSelection = selectedFeature !== null;

  // ─── Polygon accessor callbacks ───────────────────────────────────────────
  const capColor = useCallback(
    (feat: object) => {
      return getCapColor(feat, feat === hoveredFeature, feat === selectedFeature, hasSelection);
    },
    [hoveredFeature, selectedFeature, hasSelection]
  );

  const strokeColor = useCallback(
    (feat: object) => {
      return getStrokeColor(feat, feat === hoveredFeature, feat === selectedFeature, hasSelection);
    },
    [hoveredFeature, selectedFeature, hasSelection]
  );

  const altitude = useCallback(
    (feat: object) => {
      return getAltitude(feat === hoveredFeature, feat === selectedFeature);
    },
    [hoveredFeature, selectedFeature]
  );

  // Country name tooltip (shown when not in selection mode)
  const rawHoveredCountry     = hoveredFeature ? (hoveredFeature as any).properties?.name ?? "" : "";
  const hoveredCountryDisplay = !hasSelection
    ? normalizeCountryName(REVERSE[rawHoveredCountry] ?? rawHoveredCountry)
    : "";
  const tooltipLabel = hoveredCountryDisplay;

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const allowNativeContextMenu = (event: MouseEvent) => {
      event.stopPropagation();
    };
    el.addEventListener("contextmenu", allowNativeContextMenu, true);
    return () => el.removeEventListener("contextmenu", allowNativeContextMenu, true);
  }, []);

  const globeShiftPx = isDashboardOpen
    ? -Math.round(Math.min(260, Math.max(140, dims.w * 0.14)))
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseDown={handleInteraction}
      onMouseMove={handleMouseMove}
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translateX(${globeShiftPx}px)`,
          transition: "transform 560ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Globe
          ref={globeRef}
          width={dims.w}
          height={dims.h}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere
          atmosphereColor="#2f86de"
          atmosphereAltitude={0.22}
          showGraticules={false}
          polygonsData={countries}
          polygonCapColor={capColor}
          polygonSideColor={() => "#0b2d6b"}
          polygonStrokeColor={strokeColor}
          polygonAltitude={altitude}
          polygonsTransitionDuration={200}
          polygonLabel={() => ""}
          onPolygonHover={handlePolygonHover}
          onPolygonClick={handlePolygonClick}
          onGlobeClick={handleGlobeClick}
          onGlobeReady={onGlobeReady}
        />
      </div>

      {/* Back button */}
      {hasSelection && (
        <button
          onClick={handleBack}
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl
                     text-white/80 hover:text-white text-sm font-medium transition-all
                     border border-white/10 hover:border-white/30"
          style={{ background: "rgba(8,10,20,0.85)", backdropFilter: "blur(16px)" }}
        >
          ← World view
        </button>
      )}

      {/* Cursor tooltip — country name or state name */}
      {tooltipLabel && (
        <div
          className="fixed z-40 px-3 py-1.5 rounded-lg pointer-events-none"
          style={{
            background:      "rgba(4,8,24,0.92)",
            backdropFilter:  "blur(14px)",
            left:            mousePos.x,
            top:             mousePos.y - 44,
            transform:       "translateX(-50%)",
            border:          "1px solid rgba(34,211,238,0.20)",
            fontFamily:      "monospace",
            fontSize:        "12px",
            fontWeight:      600,
            letterSpacing:   "0.06em",
            color:           "rgba(255,255,255,0.90)",
            textTransform:   "uppercase",
            boxShadow:       "0 0 18px rgba(34,211,238,0.06)",
            whiteSpace:      "nowrap",
          }}
        >
          {tooltipLabel}
        </div>
      )}

      {/* Intelligence Dossier */}
      <AnimatePresence>
        {dossier && (
          <IntelligenceDossier
            key={dossier.country}
            country={dossier.country}
            crisis={dossier.crisis}
            onClose={handleBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
