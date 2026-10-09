# MEADOW — Project Handoff

## Current Status
- **Current Milestone**: Milestone 4 (Procedural Art, Wind Field & Particles).
- **Completed**:
  - Milestone 0: Clean slate Vite + TS setup.
  - Milestone 1: Custom WebGL2 batched renderer with Canvas 2D fallback, 120Hz loop, character rig.
  - Milestone 2: Seeded PRNG, multi-layer noise, worker pool chunk streaming, traversability tests.
  - Milestone 3: Hydrology, structures, bridges, paths.
  - Look and Smoothness Fix: Restored calm M3 palettes & water shader; static chunk GPU caching; camera & player simulation interpolation; final device-pixel snapping; F3 debug overlay; organic path bridges.
  - Milestone 4 (Step 4.1): Extended Biome Palettes & Toolkit Props (mushrooms, ferns, shrubs, birch trees).
  - Milestone 4 (Step 4.2): Global Wind Field & CPU Particle Pool (pollen, petals, leaves, footstep dust, fireflies with wind advection).
- **In progress**:
  - Milestone 4 (Step 4.3): Dynamic Grass Parting & Ripples.
- **Next Item in ROADMAP.md**:
  - Milestone 5 (Step 5.1): Time of Day System & Overlays.

## How to Run & Verify
1. **Dev Server**: `npm run dev` (running at `http://127.0.0.1:5173/wander/`)
2. **Type Check**: `npx tsc --noEmit`
3. **Build**: `npm run build`
4. **Test**: `npm run test`

## Known Bugs / Blockers
- None. Everything builds cleanly with zero errors and 100% test pass rate.

