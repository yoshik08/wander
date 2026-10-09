# MEADOW — Project Handoff

## Current Status
- **Current Milestone**: Completed Milestone 2. Ready for Milestone 3 (Hydrology, Water Shader, Paths, Bridges & Structures).
- **Completed**:
  - Milestone 0: Clean slate Vite + TS + Vitest setup, directory structure, strict configs.
  - Milestone 1: Custom WebGL2 batched renderer with Canvas 2D fallback, 120Hz loop, unified input, camera with lookahead, 2.5D traveler bone rig with Verlet scarf.
  - Milestone 2: Seeded PRNG suite (MurmurHash3 + Mulberry32), URL seed param, multi-layer noise pipeline, Web Worker chunk streaming with transferable buffers, synchronous spawn chunks, 13 distinct biomes, sliding collision, flat memory footprint, and 500-seed traversability test suite.
- **Next Item in PLAN.md**:
  - Milestone 3: Hydrology, Water Shader, Paths & Structures (downhill river flow network, waterfalls, custom water shader with flow mapping & shoreline foam, procedural winding dirt paths, wooden bridges, stepping stones, and sparse deterministic landmarks/structures).

## How to Run & Verify
1. **Dev Server**: `npm run dev` (running at `http://127.0.0.1:5173/wander/`)
2. **Type Check**: `npx tsc --noEmit`
3. **Build**: `npm run build`
4. **Test**: `npm run test`

## Known Bugs / Blockers
- None. Everything builds cleanly and runs at 120Hz.
