# MEADOW — Architectural & Design Notes

## Core Philosophy
MEADOW is designed as a meditative, deeply atmospheric nature simulation where wandering, noticing, collecting, and resting are the sole pursuits. We draw visual and emotional inspiration from:
- *A Short Hike*: Charming character physics, effortless movement, cozy dialogue/ambience.
- *Eastward* & *Stardew Valley*: Crisp pixel-art lighting, lush vegetation, warm morning color palettes.
- *Ghibli Backgrounds* & *Alba*: Painterly greens, billowing wind-brushed grasslands, dynamic cloud shadows.

## Architectural Decisions
1. **Zero External Game Engines or Heavy Frameworks**:
   - Built with modern WebGL2 with an automatic Canvas 2D fallback.
   - Thin sprite batching pipeline capable of rendering tens of thousands of quads, animated water, grass, and particles at 120+ FPS.
2. **Deterministic World Generation**:
   - Seed in the URL hashes into a 64-bit seed (MurmurHash3 / SplitMix64).
   - Multi-layer procedural noise (continentalness, elevation, temperature, moisture, erosion, domain warping) computed in Web Workers using transferable buffers.
   - Synchronous generation of the spawn chunks ensures frame 1 always has rich, beautiful terrain with zero black frames or popping.
3. **Hydrology & Geography**:
   - Rivers generate with physical gradient flow vectors rather than static cutouts.
   - True downhill flow drives water animation direction and floating autumn leaves.
4. **Pure Procedural Audio**:
   - 100% synthesized Web Audio API soundscapes (binaural wind, spatialized flowing water, chirping songbirds, generative pentatonic chimes). No external audio assets.
5. **Fluid Motion & Input**:
   - 120Hz fixed-timestep physics and logic with interpolation during rendering.
   - Sub-pixel smooth movement with subtle character leaning, verlet cloth simulation for scarves, and footprint surface displacement.

## Milestone 1 Critique & Review
- **Visuals**: WebGL2 batched renderer successfully initializes with high frame rate (120Hz loop). On desktop (1280x800) and both phone viewports (412x915, 393x852), the character is centered and responsive.
- **Character**: Upright 2.5D traveler bone rig with backpack, beanie, boots, and verlet scarf functions with fluid turning lean and footsteps.
- **Terrain Note**: The plain meadow test tiles demonstrate batched rendering and camera lookahead. Next milestone replaces flat test grid with the full multi-layer seeded procedural noise, chunk streaming worker pool, and traversability tests.

## Milestone 2 Critique & Review
- **Streaming & Performance**: Worker pool with transferable buffers generates chunks smoothly in the background while synchronous spawn chunks guarantee immediate frame 1 display. Unloading beyond radius keeps chunk count capped (at ~49 active chunks) preventing memory leaks.
- **Traversability**: 500-seed automated test validates that spawn points in all seeds have open walkable corridors without pocket entrapment.
- **Visual Critique**:
  - The river carver is functional but raw blocky tile steps look unnatural against the landscape.
  - Hard tile transitions between sand and grass need organic shoreline transitions.
  - Milestone 3 will introduce continuous river curves, shoreline foam, waterfalls, bridges, and winding dirt paths!

## Look and Smoothness Fix Critique
- **Visuals & Palettes**: Restored the clean, cohesive M3 meadow and lake color palettes (#4E8A42 / #437B38 / #589C4B and #3D8FD1 / #175276). Removed harsh fragment discard artifacts and dark shoreline borders by rendering a continuous riverbed layer and gentle alpha-blended undulating foam rims. Bridges now generate strictly where paths cross waterways.
- **Performance & Smoothness**: Static chunk caching via pre-baked WebGL2 VAO/VBOs completely eliminated per-frame tile quad rebuilds and allocations, dropping frame times to under 0.5ms. Both camera and player are smoothly interpolated with simulation alpha and snapped to physical device pixels, eliminating judder across high refresh displays (60/90/120/144Hz).
- **F3 Overlay**: High-resolution diagnostic overlay cleanly reports real-time FPS, frame time ms, simulation rate, draw call count, coordinates, and active chunk metrics without consuming sprite batch quota.

