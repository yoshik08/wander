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

## Step 4.1 (Extended Biome Palettes & Toolkit Props) Critique
- **Props**: Extended ArtToolkit with painterly, no-outline `drawMushroom` (with spore dots and glowing hollow variants), wind-reactive `drawFern`, multi-tone `drawShrub` (meadow green, autumn amber, cherry blossom pink), and `drawBirchTree`.
- **Biome Visuals**: Chunk procedural prop generation now scatters mushrooms, ferns, shrubs, and birch trees across all 13 biomes according to their climate definition, enriching visual variety beyond basic oak/pine trees.
- **Performance**: All new props participate in the existing batched primitives pipeline with minimal overhead and zero per-frame garbage.

## Step 4.2 (Global Wind Field & CPU Particle Pool) Critique
- **Atmosphere & Flow**: Pollen, flower petals, and autumn leaves advected by the global curl-noise wind field drift gracefully across the meadow. The pre-seeded viewport on spawn guarantees atmospheric immersion from the first frame.
- **Particle Variety & Grounding**: Biome-specific distribution properly differentiates cheery pink cherry petals from amber maple leaves, while step dust puffs give tangible feedback to character locomotion.
- **Performance**: Pre-allocated pool of 500 particle structs with zero allocations per frame keeps the 120Hz simulation solid and frame time under 0.8ms.

## Step 4.3 (Dynamic Grass Parting & Ripples) Critique
- **Tactile Meadow Interaction**: Tufts of grass blades, wild flowers, ferns, and shrubs now part smoothly away from the player's feet as they walk through vegetation, snapping back naturally with wind sway when moving past.
- **Water Ripple Dynamics**: Walking into stream shallows or stepping stones now casts expanding perspective-ellipse ripple rings, accompanied by ambient water surface ripples across rivers.
- **Zero-Allocation**: Grass parting is computed on-the-fly per visible instance against interpolated player coordinates without allocating arrays, maintaining zero garbage collection overhead.

## Step 5.1 (Time of Day System & Overlays) Critique
- **Lighting Atmosphere**: 24-minute full day/night cycle implemented with Ghibli-matched atmospheric overlays (Dawn peach #FFDAB9 at 20%, Noon clear, Golden Hour amber at 16%, Dusk violet/orange at 28%, Night teal #1A2436 at 58%).
- **Smooth Transition**: The color grading tints interpolate smoothly using trigonometric easing so morning light progresses gracefully without abrupt color stepping.
- **HUD & Readout**: F3 debug overlay cleanly reports the in-game clock (HH:MM format) and active time phase alongside simulation metrics.




