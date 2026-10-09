# MEADOW — Project Handoff

## Current Status
- **Current Milestone**: Completed Milestone 3.5 (Art Direction Polish). Ready for Milestone 4 (Procedural Art, Wind Field & Particles).
- **Completed**:
  - Milestone 0: Clean slate Vite + TS setup.
  - Milestone 1: Custom WebGL2 batched renderer with Canvas 2D fallback, 120Hz loop, character rig.
  - Milestone 2: Seeded PRNG, multi-layer noise, worker pool chunk streaming, traversability tests.
  - Milestone 3: Hydrology, structures, bridges, paths.
  - Milestone 3.5 (Art Direction): Terrain shader core with macro noise, smooth marching-squares water shader with Voronoi caustics, reusable `ArtToolkit`, character/prop rescaling to 48px/64px, blob shadows, and fading dust particles.
- **Next Item in ROADMAP.md**:
  - Milestone 4 (Step 4.1): Extended Biome Palettes & Toolkit Props (expand palettes and add new props to ArtToolkit).

## How to Run & Verify
1. **Dev Server**: `npm run dev` (running at `http://127.0.0.1:5173/wander/`)
2. **Type Check**: `npx tsc --noEmit`
3. **Build**: `npm run build`
4. **Test**: `npm run test`

## Known Bugs / Blockers
- None. Everything builds cleanly and runs at 120Hz.
