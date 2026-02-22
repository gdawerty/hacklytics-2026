import { useRef, useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { crisisData, CrisisPoint } from "@/data/heatmapData";
import { IntelligenceDossier } from "./IntelligenceDossier";

const IDLE_MS = 40_000;
const STAR_COUNT = 14_000;
const STAR_NEAR = 700;
const STAR_FAR = 3600;
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

function focusAltitude(bbox: BBox): number {
  // Keep focus on the clicked country while preserving a full-globe framing.
  return Math.max(1.95, Math.min(2.35, bboxAltitude(bbox)));
}

// ─── Neon cyan palette ─────────────────────────────────────────────────────
const CYAN = "34,211,238"; // #22d3ee

// ─── Country color helpers ─────────────────────────────────────────────────
function getCapColor(feat: object, isHovered: boolean, isSelected: boolean, hasSelection: boolean): string {
  const name = (feat as any).properties?.name ?? "";
  void name; // unused until heat data is re-enabled

  if (hasSelection) {
    if (isSelected) return `rgba(${LAND_BASE},0.80)`;
    if (isHovered) return `rgba(${LAND_BASE},0.28)`;
    return `rgba(${LAND_BASE},0.10)`;
  }

  if (isHovered) return `rgba(${LAND_BASE},0.62)`;
  return `rgba(${LAND_BASE},0.46)`;
}

function getStrokeColor(feat: object, isHovered: boolean, isSelected: boolean, hasSelection: boolean): string {
  void feat;
  if (isSelected)   return `rgba(${CYAN},0.95)`;
  if (hasSelection) return "rgba(255,255,255,0.12)";
  if (isHovered)    return `rgba(${CYAN},0.80)`;
  return "rgba(8, 3, 3, 0.9)";
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
    const geoUrl = `${import.meta.env.BASE_URL}data/countries.geojson`;
    fetch(geoUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON load failed: ${r.status}`);
        return r.json();
      })
      .then((data) => setCountries(data.features ?? []))
      .catch(() => setCountries([]));
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
    const scene = globeRef.current.scene() as THREE.Scene;
    
    // Find and color the globe mesh directly
    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.geometry || !mesh.material) return;
      
      // Look for the main globe sphere (usually has a geometry with many vertices)
      const geom = mesh.geometry as THREE.BufferGeometry;
      if (geom.attributes?.position?.count > 1000) {
        // This is the globe base
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat: any) => {
          mat.color = new THREE.Color("#010716");
          mat.emissive = new THREE.Color("#010427");
          mat.emissiveIntensity = 0.6;
          mat.shininess = 0.5;
          mat.specular = new THREE.Color(0x5ec8ff);
          mat.needsUpdate = true;
        });
        // Ensure globe base renders first
        mesh.renderOrder = 0;
      } else if (geom.attributes?.position?.count > 0) {
        // Polygons and other geometry render on top
        mesh.renderOrder = 1;
      }
    });
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
      if (globeRef.current) (globeRef.current.controls() as any).autoRotate = true;
    }, IDLE_MS);
  }, []);

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

  // Back → world view
  const handleBack = useCallback(() => {
    setSelectedFeature(null);
    setDossier(null);
    onSelectionChange?.(false);
    globeRef.current?.pointOfView({ altitude: 2.5 }, 1200);
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
    const alt  = focusAltitude(bbox);
    globeRef.current?.pointOfView({ lat, lng, altitude: alt }, 1200);

    setSelectedFeature(feat);
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

  // Country name tooltip:
  // show in world view, and also while zoomed-in when hovering a different country.
  const rawHoveredCountry = hoveredFeature ? (hoveredFeature as any).properties?.name ?? "" : "";
  const isHoveringOtherCountry = Boolean(
    hoveredFeature && (!hasSelection || hoveredFeature !== selectedFeature)
  );
  const hoveredCountryDisplay = isHoveringOtherCountry
    ? normalizeCountryName(REVERSE[rawHoveredCountry] ?? rawHoveredCountry)
    : "";
  const tooltipLabel = hoveredCountryDisplay;

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const globeShiftPx = hasSelection
    ? -Math.round(
        dims.w < 900
          ? Math.min(220, Math.max(120, dims.w * 0.18))
          : Math.min(430, Math.max(240, dims.w * 0.24))
      )
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
          atmosphereColor="hsl(235,75%,22%)"
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
