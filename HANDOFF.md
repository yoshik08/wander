# MEADOW — Project Handoff

## Current Status
- **Current Milestone**: Completed Milestone 1. Ready for Milestone 2 (Seeded Infinite World & Worker Streaming).
- **Completed**:
  - Clean slate setup replacing Wander entirely.
  - Standing rules in `GEMINI.md`, task checklist in `PLAN.md`, design notes in `NOTES.md`.
  - Custom WebGL2 batched renderer with automatic Canvas 2D fallback (`src/render/`).
  - 120Hz fixed-timestep game loop with render interpolation and visibility change pausing (`src/core/loop.ts`).
  - Unified multi-device input manager for keyboard, gamepad, and touch controls (`src/core/input.ts`).
  - Smooth camera with lookahead and easing (`src/core/camera.ts`).
  - Traveler bone rig with customizable colorways, hats, backpacks, and Verlet cloth simulation for the scarf (`src/entities/character.ts`, `src/entities/verlet.ts`).
  - Strict TypeScript and Vite production build passing with 0 errors. Initial bundle is only 22 kB.
  - Visual verification with screenshots on desktop (1280x800) and phones (412x915, 393x852).
- **Next Item in PLAN.md**:
  - Milestone 2: Seeded infinite world (MurmurHash3 seed, URL seed param, multi-layer noise pipeline, Web Worker pool with transferable buffers, synchronous spawn chunks, collision mapping, and 500-seed traversability test).

## How to Run & Verify
1. **Dev Server**: `npm run dev` (running at `http://127.0.0.1:5173/wander/`)
2. **Type Check**: `npx tsc --noEmit`
3. **Build**: `npm run build`
4. **Test**: `npm run test`

## Known Bugs / Blockers
- None. Everything builds cleanly and runs at 120Hz.
