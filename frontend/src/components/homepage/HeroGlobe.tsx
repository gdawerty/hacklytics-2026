import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";

type Feature = Record<string, any>;

const SAGE_RGB = "125,154,142";
const LAND_RGB = "58,88,73";

export default function HeroGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 920, h: 620 });
  const [countries, setCountries] = useState<Feature[]>([]);
  const [hovered, setHovered] = useState<Feature | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: Math.round(width), h: Math.round(height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const geoUrl = `${import.meta.env.BASE_URL}data/countries.geojson`;
    fetch(geoUrl)
      .then((r) => (r.ok ? r.json() : { features: [] }))
      .then((d) => setCountries((d.features ?? []) as Feature[]))
      .catch(() => setCountries([]));
  }, []);

  const onReady = useCallback(() => {
    if (!globeRef.current) return;

    /* ── Controls ─────────────────────────────────────────────────────────── */
    const controls = globeRef.current.controls() as any;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = false;
    controls.enablePan = false;
    globeRef.current.pointOfView({ lat: 12, lng: 15, altitude: 2.05 }, 0);

    /* ── Ocean colour ─────────────────────────────────────────────────────── */
    // Use .set() on the existing color objects — avoids cross-build Three.js
    // instance issues that would occur with `new THREE.Color(...)`.
    // Leave globe.gl's default lighting untouched for the same reason.
    const mat = (globeRef.current as any).globeMaterial();
    mat.color.set("#1a4a8c");
    mat.emissive.set("#0a2040");
    mat.emissiveIntensity = 0.25;
    mat.shininess = 18;
    mat.needsUpdate = true;
  }, []);

  const capColor = useCallback(
    (f: Feature) => (f === hovered ? `rgba(${LAND_RGB},0.85)` : `rgba(${LAND_RGB},0.60)`),
    [hovered]
  );

  const strokeColor = useCallback(
    (f: Feature) => (f === hovered ? `rgba(${SAGE_RGB},0.95)` : `rgba(${SAGE_RGB},0.22)`),
    [hovered]
  );

  const altitude = useMemo(() => (f: Feature) => (f === hovered ? 0.018 : 0.004), [hovered]);

  return (
    <div ref={hostRef} className="absolute inset-0 pointer-events-auto">
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        backgroundColor="rgba(0,0,0,0)"
        polygonsData={countries}
        polygonCapColor={capColor}
        polygonSideColor={() => "rgba(10,24,20,0.55)"}
        polygonStrokeColor={strokeColor}
        polygonAltitude={altitude}
        polygonsTransitionDuration={160}
        onPolygonHover={(f) => setHovered((f as Feature) ?? null)}
        polygonLabel={() => ""}
        showAtmosphere
        atmosphereColor="#28473c"
        atmosphereAltitude={0.14}
        onGlobeReady={onReady}
      />
    </div>
  );
}
