import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import Globe, { GlobeMethods } from "react-globe.gl";
import { crisisData, CrisisPoint } from "@/data/heatmapData";
import { IntelligenceDossier } from "./IntelligenceDossier";

const IDLE_MS = 40_000;

// ─── Name mapping: crisis data → GeoJSON names ────────────────────────────
const NAME_MAP: Record<string, string> = {
  "DR Congo":       "Democratic Republic of the Congo",
  "United States":  "USA",
  "United Kingdom": "England",
};

const crisisMap = new Map<string, CrisisPoint>();
for (const d of crisisData) {
  crisisMap.set(NAME_MAP[d.country] ?? d.country, d);
}

// GeoJSON country name → ISO 2-letter code (for admin-1 state lookup)
const COUNTRY_TO_ISO2: Record<string, string> = {
  "India":                            "IN",
  "Afghanistan":                      "AF",
  "South Sudan":                      "SS",
  "Syria":                            "SY",
  "Democratic Republic of the Congo": "CD",
  "Somalia":                          "SO",
  "Ethiopia":                         "ET",
  "Sudan":                            "SD",
  "Haiti":                            "HT",
  "Ukraine":                          "UA",
  "Myanmar":                          "MM",
  "Mali":                             "ML",
  "Lebanon":                          "LB",
  "USA":                              "US",
  "England":                          "GB",
  "Brazil":                           "BR",
  "Yemen":                            "YE",
};

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
function heatHSL(intensity: number): string {
  let h: number;
  if (intensity < 0.33)      h = 210 - 90 * (intensity / 0.33);
  else if (intensity < 0.66) h = 120 - 75 * ((intensity - 0.33) / 0.33);
  else                       h =  45 - 45 * ((intensity - 0.66) / 0.34);
  return `${h.toFixed(0)},80%,52%`;
}

function getCapColor(feat: object, isHovered: boolean, isSelected: boolean, hasSelection: boolean): string {
  const name   = (feat as any).properties?.name ?? "";
  const crisis = crisisMap.get(name);

  if (hasSelection) {
    if (isSelected) return `rgba(${CYAN},0.14)`;
    return "rgba(0,0,0,0)";
  }

  if (isHovered) return `rgba(${CYAN},0.11)`;
  if (!crisis)   return "rgba(255,255,255,0.03)";

  // Crisis countries: very muted heat tint
  const alpha = 0.09 + crisis.intensity * 0.13;
  return `hsla(${heatHSL(crisis.intensity)},${alpha.toFixed(2)})`;
}

function getStrokeColor(feat: object, isHovered: boolean, isSelected: boolean, hasSelection: boolean): string {
  if (isSelected)   return `rgba(${CYAN},0.95)`;
  if (hasSelection) return "rgba(0,0,0,0)";
  if (isHovered)    return `rgba(${CYAN},0.80)`;
  const name = (feat as any).properties?.name ?? "";
  return crisisMap.has(name) ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)";
}

function getAltitude(isHovered: boolean, isSelected: boolean): number {
  if (isSelected) return 0.003;
  if (isHovered)  return 0.016;
  return 0.004;
}

// ─── State (admin-1) color helpers — hover only, no click ─────────────────
function getStateCapColor(isHovered: boolean): string {
  return isHovered ? `rgba(${CYAN},0.10)` : "rgba(255,255,255,0.02)";
}

function getStateStrokeColor(isHovered: boolean): string {
  return isHovered ? `rgba(${CYAN},0.70)` : `rgba(${CYAN},0.20)`;
}

function getStateAltitude(isHovered: boolean): number {
  return isHovered ? 0.020 : 0.008;
}

// ─── Root ─────────────────────────────────────────────────────────────────
export default function GlobeScene() {
  const globeRef     = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const [countries,       setCountries]       = useState<object[]>([]);
  const [hoveredFeature,  setHoveredFeature]  = useState<object | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<object | null>(null);

  // Admin-1 state boundaries — hover only
  const [stateFeatures, setStateFeatures] = useState<object[]>([]);
  const [hoveredState,  setHoveredState]  = useState<object | null>(null);
  const [statesLoading, setStatesLoading] = useState(false);

  const admin1DataRef    = useRef<object[] | null>(null);
  const admin1LoadingRef = useRef(false);

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

  // Lazy-load admin-1 GeoJSON once; cache in memory
  const loadAdmin1 = useCallback(async (): Promise<object[] | null> => {
    if (admin1DataRef.current) return admin1DataRef.current;
    if (admin1LoadingRef.current) return null;
    admin1LoadingRef.current = true;
    try {
      const r = await fetch("/data/admin1.geojson");
      if (!r.ok) return null;
      const d = await r.json();
      admin1DataRef.current = d.features ?? [];
      return admin1DataRef.current;
    } catch {
      return null;
    } finally {
      admin1LoadingRef.current = false;
    }
  }, []);

  const loadStatesForCountry = useCallback(async (geoName: string) => {
    const iso2 = COUNTRY_TO_ISO2[geoName];
    if (!iso2) { setStateFeatures([]); return; }
    setStatesLoading(true);
    const all = await loadAdmin1();
    setStatesLoading(false);
    if (!all) { setStateFeatures([]); return; }
    setStateFeatures(all.filter((f: any) => f.properties?.iso_a2 === iso2));
  }, [loadAdmin1]);

  // Auto-rotate init
  const onGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls() as any;
    ctrl.autoRotate      = true;
    ctrl.autoRotateSpeed = 0.4;
  }, []);

  // Stop rotation + arm idle timer
  const handleInteraction = useCallback(() => {
    if (globeRef.current) (globeRef.current.controls() as any).autoRotate = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (globeRef.current) (globeRef.current.controls() as any).autoRotate = true;
    }, IDLE_MS);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Back → world view
  const handleBack = useCallback(() => {
    setSelectedFeature(null);
    setHoveredState(null);
    setStateFeatures([]);
    setDossier(null);
    globeRef.current?.pointOfView({ altitude: 2.5 }, 1200);
    handleInteraction();
  }, [handleInteraction]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && selectedFeature) handleBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBack, selectedFeature]);

  // Country click → zoom + dossier + load state outlines
  const handlePolygonClick = useCallback((feat: object) => {
    // Ignore clicks on state overlay polygons
    if ((feat as any)._drillState) return;

    handleInteraction();
    if (feat === selectedFeature) { handleBack(); return; }

    const bbox = getFeatureBBox(feat);
    const lat  = (bbox.minLat + bbox.maxLat) / 2;
    const lng  = (bbox.minLng + bbox.maxLng) / 2;
    const alt  = bboxAltitude(bbox);
    globeRef.current?.pointOfView({ lat, lng, altitude: alt }, 1200);

    setSelectedFeature(feat);
    setHoveredState(null);

    const geoName     = (feat as any).properties?.name ?? "";
    const crisis      = crisisMap.get(geoName) ?? null;
    const displayName = REVERSE[geoName] ?? geoName;
    setDossier({ country: displayName, crisis });

    loadStatesForCountry(geoName);
  }, [handleInteraction, handleBack, selectedFeature, loadStatesForCountry]);

  // Click blank globe → close
  const handleGlobeClick = useCallback(() => {
    if (selectedFeature) handleBack();
  }, [selectedFeature, handleBack]);

  // Unified hover: differentiates country vs state polygon
  const handlePolygonHover = useCallback((feat: object | null) => {
    if (!feat) {
      setHoveredFeature(null);
      setHoveredState(null);
      return;
    }
    if ((feat as any)._drillState) {
      setHoveredState(feat);
      setHoveredFeature(null);
    } else {
      setHoveredFeature(feat);
      setHoveredState(null);
    }
  }, []);

  const hasSelection = selectedFeature !== null;

  // Merge countries + tagged state outlines
  const allPolygons = useMemo(() => {
    if (!stateFeatures.length) return countries;
    const tagged = stateFeatures.map(f => ({ ...(f as any), _drillState: true }));
    return [...countries, ...tagged];
  }, [countries, stateFeatures]);

  // ─── Polygon accessor callbacks ───────────────────────────────────────────
  const capColor = useCallback(
    (feat: object) => {
      if ((feat as any)._drillState)
        return getStateCapColor(feat === hoveredState);
      return getCapColor(feat, feat === hoveredFeature, feat === selectedFeature, hasSelection);
    },
    [hoveredFeature, selectedFeature, hasSelection, hoveredState]
  );

  const strokeColor = useCallback(
    (feat: object) => {
      if ((feat as any)._drillState)
        return getStateStrokeColor(feat === hoveredState);
      return getStrokeColor(feat, feat === hoveredFeature, feat === selectedFeature, hasSelection);
    },
    [hoveredFeature, selectedFeature, hasSelection, hoveredState]
  );

  const altitude = useCallback(
    (feat: object) => {
      if ((feat as any)._drillState)
        return getStateAltitude(feat === hoveredState);
      return getAltitude(feat === hoveredFeature, feat === selectedFeature);
    },
    [hoveredFeature, selectedFeature, hoveredState]
  );

  const hoveredStateName = hoveredState ? (hoveredState as any).properties?.name ?? "" : "";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseDown={handleInteraction}
    >
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        globeImageUrl="/images/earth-night.jpg"
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere
        atmosphereColor="hsl(200,70%,30%)"
        atmosphereAltitude={0.14}
        showGraticules={false}
        polygonsData={allPolygons}
        polygonCapColor={capColor}
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonStrokeColor={strokeColor}
        polygonAltitude={altitude}
        polygonsTransitionDuration={200}
        polygonLabel={() => ""}
        onPolygonHover={handlePolygonHover}
        onPolygonClick={handlePolygonClick}
        onGlobeClick={handleGlobeClick}
        onGlobeReady={onGlobeReady}
      />

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

      {/* State boundary loading indicator */}
      {statesLoading && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-lg
                     text-white/50 text-[11px] font-mono pointer-events-none"
          style={{ background: "rgba(8,10,20,0.80)", backdropFilter: "blur(12px)" }}
        >
          Loading state boundaries…
        </div>
      )}

      {/* State name tooltip on hover */}
      {hoveredStateName && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-lg
                     text-white/85 text-xs font-medium pointer-events-none"
          style={{ background: "rgba(8,10,20,0.80)", backdropFilter: "blur(12px)" }}
        >
          {hoveredStateName}
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
