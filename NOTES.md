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

## Milestone 3.5 (Art Direction Polish) Critique
- **Terrain & Water**: The new shader core applies domain warping and macro-noise color shifts, successfully breaking up the repetitive tile grid. The marching squares discard trick in the water shader creates organic curved shorelines instead of blocky tiles. Voronoi caustics add a beautiful dynamic shimmer.
- **Character Scale & Presence**: Scaling the character to 48px/64px gives them much better visibility and weight against the expansive landscape. The new fading dust particles and soft blob shadows ground movement perfectly.
- **Art Toolkit**: Moving to an `ArtToolkit` centralized the painterly color-block style (no black outlines!). CPU-side vertex swaying for trees, flowers, and grass works flawlessly with the existing `globalWind` without complicating the batched quads pipeline.
- **Next Steps**: Now that the core visual foundation (Ghibli-style painterly greens, organic edges) is established, the procedural generation logic for the remaining biomes and weather effects can safely reuse this toolkit.
