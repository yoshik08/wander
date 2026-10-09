# MEADOW — Project Handoff

## Current Status
- **Current Milestone**: Milestone 5 (Dynamic Lighting, Shadows & Post-Processing).
- **Completed**:
  - Milestone 0: Clean slate Vite + TS setup.
  - Milestone 1: Custom WebGL2 batched renderer with Canvas 2D fallback, 120Hz loop, character rig.
  - Milestone 2: Seeded PRNG, multi-layer noise, worker pool chunk streaming, traversability tests.
  - Milestone 3: Hydrology, structures, bridges, paths.
  - Look and Smoothness Fix: Restored calm M3 palettes & water shader; static chunk GPU caching; camera & player simulation interpolation; final device-pixel snapping; F3 debug overlay; organic path bridges.
  - Milestone 4: Procedural Art, Wind Field & Particles (13 biomes, procedural props, wind field, CPU particle pool, dynamic grass parting, water ripples).
- **In progress**:
  - Milestone 5 (Step 5.1): Time of Day System & Overlays.
- **Next Item in ROADMAP.md**:
  - Milestone 5 (Step 5.2): Dynamic Sun Angles & Shadows.

## How to Run & Verify
1. **Dev Server**: `npm run dev` (running at `http://127.0.0.1:5173/wander/`)
2. **Type Check**: `npx tsc --noEmit`
3. **Build**: `npm run build`
4. **Test**: `npm run test`

## Known Bugs / Blockers
- None. Everything builds cleanly with zero errors and 100% test pass rate.

