import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  speed: number;
  hue: number;
  sat: number;
  lit: number;
  twinkle: boolean; // only ~30% of stars actually twinkle
}

interface StarfieldCanvasProps {
  warp?: boolean;
}

export default function StarfieldCanvas({ warp = false }: StarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    let W = window.innerWidth;
    let H = window.innerHeight;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width  = W;
      canvas!.height = H;
    }
    resize();
    window.addEventListener("resize", resize);

    function starColor(): { hue: number; sat: number; lit: number } {
      const rng = Math.random();
      if (rng > 0.97) return { hue: 0, sat: 55, lit: 68 + Math.random() * 10 };
      if (rng > 0.92) return { hue: 26, sat: 50 + Math.random() * 20, lit: 75 + Math.random() * 15 };
      if (rng > 0.83) return { hue: 45, sat: 25 + Math.random() * 20, lit: 84 + Math.random() * 12 };
      if (rng > 0.55) return { hue: 215, sat: 15 + Math.random() * 18, lit: 80 + Math.random() * 18 };
      return { hue: 0, sat: 0, lit: 82 + Math.random() * 18 };
    }

    const COUNT = warp ? 2200 : 420;
    const stars: Star[] = Array.from({ length: COUNT }, () => {
      const { hue, sat, lit } = starColor();
      // Power distribution so most are tiny, few are large (realistic)
      const r = Math.pow(Math.random(), 2.8) * 1.9 + 0.18;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r,
        opacity: Math.random() * 0.7 + 0.2,
        speed: (Math.random() * 0.003 + 0.0004) * (Math.random() > 0.5 ? 1 : -1),
        hue, sat, lit,
        twinkle: Math.random() > 0.70, // 30% twinkle noticeably
      };
    });

    // ── Parallax ────────────────────────────────────────────────────────────
    let parallaxX = 0, parallaxY = 0;
    let targetPX  = 0, targetPY  = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetPX = (e.clientX / W - 0.5) * -32;
      targetPY = (e.clientY / H - 0.5) * -20;
    };
    window.addEventListener("mousemove", onMouseMove);

    function draw() {
      const cx = W * 0.5;
      const cy = H * 0.5;

      parallaxX += (targetPX - parallaxX) * 0.028;
      parallaxY += (targetPY - parallaxY) * 0.028;

      ctx.fillStyle = "rgb(0,0,1)";
      ctx.fillRect(0, 0, W, H);

      for (const s of stars) {
        if (s.twinkle) {
          s.opacity += s.speed;
          if (s.opacity >= 0.92) { s.opacity = 0.92; s.speed *= -1; }
          if (s.opacity <= 0.08) { s.opacity = 0.08; s.speed *= -1; }
        }

        const sx = ((s.x + parallaxX) % W + W) % W;
        const sy = ((s.y + parallaxY) % H + H) % H;
        const a = s.opacity;

        if (warp) {
          const dx = sx - cx;
          const dy = sy - cy;
          const len = Math.max(12, s.r * 40);
          const mag = Math.hypot(dx, dy) || 1;
          const ux = dx / mag + (Math.random() - 0.5) * 0.08;
          const uy = dy / mag + (Math.random() - 0.5) * 0.08;
          const ex = sx - ux * len;
          const ey = sy - uy * len;

          s.x += ux * (12 + s.r * 10);
          s.y += uy * (12 + s.r * 10);
          if (s.x < -80 || s.x > W + 80 || s.y < -80 || s.y > H + 80) {
            // Re-seed across the full screen to avoid edge-only concentration.
            s.x = Math.random() * W;
            s.y = Math.random() * H;
          }

          const lg = ctx.createLinearGradient(sx, sy, ex, ey);
          lg.addColorStop(0, `hsla(${s.hue},${s.sat}%,${Math.min(99, s.lit + 10)}%,${Math.min(1, a + 0.2).toFixed(3)})`);
          lg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = lg;
          ctx.lineWidth = Math.max(0.8, s.r * 0.9);
          ctx.stroke();
          continue;
        }

        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue},${s.sat}%,${s.lit}%,${a.toFixed(3)})`;
        ctx.fill();

        if (s.r > 0.7) {
          const br = s.r * 3.4;
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, br);
          g.addColorStop(0, `hsla(${s.hue},${s.sat}%,${s.lit}%,${(a * 0.16).toFixed(3)})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(sx, sy, br, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }

        if (s.r > 1.3 && a > 0.45) {
          const len = s.r * 6;
          ctx.save();
          ctx.globalAlpha = a * 0.09;
          ctx.strokeStyle = `hsl(${s.hue},${s.sat}%,${s.lit}%)`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(sx - len, sy); ctx.lineTo(sx + len, sy);
          ctx.moveTo(sx, sy - len); ctx.lineTo(sx, sy + len);
          ctx.stroke();
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [warp]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
