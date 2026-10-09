# MEADOW — Project Handoff

## Current Status
- **Current Milestone**: Milestone 8 (Keepsakes, Journal & Map).
- **Completed**:
  - Milestone 0: Clean slate Vite + TS setup.
  - Milestone 1: Custom WebGL2 batched renderer with Canvas 2D fallback, 120Hz loop, character rig.
  - Milestone 2: Seeded PRNG, multi-layer noise, worker pool chunk streaming, traversability tests.
  - Milestone 3: Hydrology, structures, bridges, paths.
  - Look and Smoothness Fix: Restored calm M3 palettes & water shader; static chunk GPU caching; camera & player simulation interpolation; final device-pixel snapping; F3 debug overlay; organic path bridges.
  - Milestone 4: Procedural Art, Wind Field & Particles (13 biomes, procedural props, wind field, CPU particle pool, dynamic grass parting, water ripples).
  - Milestone 5: Dynamic Lighting, Shadows & Post-Processing (24-min time cycle, lighting overlays, sun-angled drop shadows, god rays, point lights & bloom).
  - Milestone 6 (Step 6.1): Weather State Machine (Clear, Breezy, Overcast, Drizzle, Thunderstorm, Fog states with organic crossfade, lightning, and wind modulation).
  - Milestone 6 (Step 6.2): Rain & Puddles (high-velocity rain streaks, impact ripple splashes, organic path puddles, damp footstep splashes).
  - Milestone 7 (Step 7.1): Flocking Birds & Butterflies (Boids steering flocks, flap/glide cycles, sun-offset shadows, perched & fluttering species-patterned butterflies).
  - Milestone 7 (Step 7.2): The Cat Companion (feline companion with follow, sit, curled sleep states, Verlet rope tail, ear twitches, blinks, and trot physics).
  - Milestone 8 (Step 8.1): Collectible Keepsakes (biome-specific items, floating bob, golden glow, proximity collection, glassmorphic toast notifications).
  - Milestone 8 (Step 8.2): Diegetic Map UI (parchment sheet, 7x7 explored chunks fog-of-war, landmark campfire pin, uncollected keepsake glints, player compass needle, cat companion pin).
  - Milestone 9 (Step 9.1): Resting on Benches & Logs (calm sit pose, peaceful breathing, eased 0.82 camera pull-back panorama, cat sleeping curl-up, interact prompt).
- **In progress**:
  - Milestone 9 (Step 9.2): Photo Mode & Postcard Filters.
- **Next Item in ROADMAP.md**:
  - Milestone 9 (Step 9.2): Photo Mode & Postcard Filters.

## How to Run & Verify
1. **Dev Server**: `npm run dev` (running at `http://127.0.0.1:5173/wander/`)
2. **Type Check**: `npx tsc --noEmit`
3. **Build**: `npm run build`
4. **Test**: `npm run test`

## Known Bugs / Blockers
- None. Everything builds cleanly with zero errors and 100% test pass rate.

