import { Suspense } from "react";
import GlobeScene from "@/components/GlobeScene";

export default function Index() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">

      {/* Globe fills the entire viewport */}
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading globe…
          </div>
        }
      >
        <GlobeScene />
      </Suspense>

      {/* Header — floats above the globe */}
      <div className="absolute top-8 left-0 right-0 z-10 text-center pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Humanitarian Crisis Predictor
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scroll to zoom · Drag to rotate · Hover a country · Click to open dossier
        </p>
      </div>

      {/* Legend bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 pointer-events-none">
        <div
          className="h-2.5 w-64 rounded-full"
          style={{
            background: "linear-gradient(to right, #60a5fa, #34d399, #facc15, #fb923c, #f87171)",
          }}
        />
        <div className="flex w-64 justify-between text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
          <span>5%</span>
          <span>Crisis Likelihood (%)</span>
          <span>95%</span>
        </div>
      </div>
    </div>
  );
}
