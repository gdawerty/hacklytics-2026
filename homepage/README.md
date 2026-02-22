# Aegis Homepage Preview (Isolated)

This folder contains a standalone homepage implementation for review before merging into `frontend/`.

## Files
- `src/pages/AegisHomepage.tsx` — full 3-panel homepage.
- `src/components/HeroGlobe.tsx` — dark interactive globe for hero section.

## Merge plan (when approved)
1. Copy `src/pages/AegisHomepage.tsx` -> `frontend/src/pages/Index.tsx`
2. Copy `src/components/HeroGlobe.tsx` -> `frontend/src/components/HeroGlobe.tsx`
3. Ensure `/` route points to `Index` in `frontend/src/App.tsx`
4. Keep `Get Started` CTA linked to `/dashboard`

## Dependencies used
- `react`
- `framer-motion`
- `lucide-react`
- `react-globe.gl`
- `three`

No frontend routes are modified yet.
