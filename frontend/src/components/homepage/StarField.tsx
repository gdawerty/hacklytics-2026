import { useMemo } from "react";

interface Star { x: number; y: number; r: number; opacity: number; dur: number; }

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 1.4 + 0.3,
      opacity: Math.random() * 0.6 + 0.15,
      dur: Math.random() * 4 + 2,
    });
  }
  return stars;
}

export default function StarField() {
  const stars = useMemo(() => generateStars(260), []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {stars.map((s, i) => (
            <animate
              key={`anim-${i}`}
              id={`a${i}`}
              attributeName="opacity"
              values={`${s.opacity};${s.opacity * 0.2};${s.opacity}`}
              dur={`${s.dur}s`}
              repeatCount="indefinite"
            />
          ))}
        </defs>

        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.045} fill="white">
            <animate
              attributeName="opacity"
              values={`${s.opacity};${s.opacity * 0.15};${s.opacity}`}
              dur={`${s.dur}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Faint nebula clusters */}
        <radialGradient id="neb1" cx="20%" cy="35%" r="30%">
          <stop offset="0%" stopColor="#1a0a3a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1a0a3a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="neb2" cx="78%" cy="65%" r="28%">
          <stop offset="0%" stopColor="#0a1a3a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0a1a3a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="neb3" cx="55%" cy="20%" r="22%">
          <stop offset="0%" stopColor="#0f2a20" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0f2a20" stopOpacity="0" />
        </radialGradient>

        <rect width="100" height="100" fill="url(#neb1)" />
        <rect width="100" height="100" fill="url(#neb2)" />
        <rect width="100" height="100" fill="url(#neb3)" />
      </svg>
    </div>
  );
}
