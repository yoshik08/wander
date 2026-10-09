# MEADOW — Complete Codebase Audit

This audit reflects the actual implementation state in code, irrespective of what `PLAN.md` or `HANDOFF.md` previously claimed.

## Milestone 0: Clean Slate & Build Foundation
- **Initialize clean package.json with Vite, TypeScript, and Vitest**: DONE (`package.json`)
- **Configure tsconfig.json with strict TypeScript checks**: DONE (`tsconfig.json`)
- **Configure vite.config.ts with base /wander/ and worker bundle options**: DONE (`vite.config.ts`)
- **Setup index.html with fullscreen viewport, manifest, and canvas container**: DONE (`index.html`)
- **Establish directory structure**: DONE (`src/core`, `src/render`, `src/world`, etc.)

## Milestone 1: Renderer, Fixed Loop, Camera & Character Rig
- **Custom WebGL2 thin renderer with batched quads/sprites and shader pipeline**: DONE (`src/render/webgl2.ts`)
- **Automatic robust Canvas 2D fallback when WebGL2 context is unavailable**: DONE (`src/render/canvas2d.ts`)
- **High-precision 120Hz fixed-timestep game loop with render interpolation**: DONE (`src/core/loop.ts`)
- **DevicePixelRatio support, window resizing, and sub-pixel camera easing**: DONE (`src/core/camera.ts`, `main.ts`)
- **Multi-input system (WASD, Arrow keys, Gamepad, Touch controls)**: DONE (`src/core/input.ts`)
- **Character bone rig with 8-directional rendering**: DONE (`src/entities/character.ts`)
- **Verlet cloth simulation for scarf and hair**: DONE (`src/entities/verlet.ts`)
- **Smooth acceleration, deceleration, turn lean, and ground interaction**: DONE (`src/entities/character.ts`)

## Milestone 2: Seeded Infinite World & Worker Streaming
- **Seeded PRNG suite**: DONE (`src/core/prng.ts`)
- **Seed in URL parameter**: DONE (`main.ts`)
- **Multi-layer noise pipeline**: DONE (`src/world/noise.ts`, `src/world/chunk.ts`)
- **Web Worker pool for procedural chunk generation**: DONE (`src/world/worker.ts`, `src/world/chunk-manager.ts`)
- **Synchronous spawn chunk generation**: DONE (`src/world/chunk-manager.ts`)
- **Dynamic chunk streaming**: DONE (`src/world/chunk-manager.ts`)
- **Collision mapping**: DONE (`src/world/chunk.ts`)
- **Traversability verification test across 500 random seeds**: DONE (`tests/world.test.ts`)

## Milestone 3: Hydrology, Water Shader, Paths & Structures
- **Downhill river flow network from springs to lakes and sea with real flow vectors**: DONE (`src/world/chunk.ts` calculates `fx`, `fy`)
- **Waterfalls where water bodies meet elevation drops**: DONE (`isWaterfall` in `src/world/chunk.ts`)
- **Water shader (shimmer, depth tint, flow mapping, shoreline foam, reflections)**: DONE (`src/render/webgl2.ts`)
- **Canvas 2D fallback water effect**: DONE (`src/render/canvas2d.ts`)
- **Procedural path network connecting points of interest**: DONE (`isPath` in `src/world/chunk.ts`)
- **Wooden bridges over streams and stone stepping stones**: DONE (`src/world/chunk.ts`)
- **Sparse deterministic structures**: DONE (`src/world/structures.ts`)
*Note: PLAN.md had these marked as incomplete, but the code proves they are fully implemented.*

## Milestone 3.5: Art Direction Polish (Ghibli Style)
- **Terrain shader core**: DONE (`src/render/webgl2.ts`)
- **Smooth marching-squares shorelines, continuous rivers**: DONE (`src/world/chunk.ts`, `webgl2.ts`)
- **Reusable art toolkit**: DONE (`src/render/art.ts`)
- **Character and tree redesign (48px/64px scale, painterly style)**: DONE (`src/render/art.ts`)

## Milestone 4: Procedural Art, Wind Field & Particles
- **13 unique biomes with handcrafted procedural color palettes**: DONE (`src/world/biomes.ts`)
- **Procedural vegetation (wind-bent grass, wild flowers, layered swaying trees, ferns, mushrooms)**: DONE (`src/render/art.ts`, `src/world/chunk.ts`)
- **Depth sorting (Y-sorting) for all environmental props**: DONE (`main.ts` renderables array)
- **Global curl-noise wind field**: DONE (`main.ts`, `src/systems/particles.ts`)
- **Particle system (CPU pool + GPU rendering)**: DONE (`src/systems/particles.ts`)
- **Dynamic grass parting and spring-back; water ripples**: DONE (`main.ts` footprint tracking)

## Milestone 5: Dynamic Lighting, Shadows & Post-Processing
- **Day/night cycle**: DONE (`src/systems/time.ts`)
- **Time-of-day phases**: DONE (`src/systems/time.ts`)
- **2D normal-mapped directional lighting and soft tree/character drop shadows**: DONE (`src/render/art.ts`)
- **God rays through canopies, bloom on highlights, and point lights**: DONE (`src/render/webgl2.ts`)
- **Post-processing color grading LUT / grading shader**: DONE (`src/render/webgl2.ts`)

## Milestone 6: Seasons & Smooth Weather
- **4 advancing seasons**: MISSING
- **Seasonal variation in biome palettes**: MISSING
- **Weather state machine**: DONE (`src/systems/weather.ts`)
- **Post-rain daylight rainbow effect**: MISSING

## Milestone 7: Procedural Wildlife & The Cat
- **Steering behaviors (flocking, fleeing, wandering, approach)**: DONE (`src/entities/boids.ts`)
- **Wildlife species**: PARTIAL (Birds and butterflies in `boids.ts`; ducks, frogs, deer, etc. missing)
- **The Cat companion**: DONE (`src/entities/cat.ts`)

## Milestone 8: Keepsakes, Journal, Landmarks & Map
- **60+ collectible keepsakes across biomes and seasons**: DONE (`src/world/chunk.ts`)
- **Interactive Journal (J) with page-turning animation and completion tracker**: MISSING
- **20 hidden landmarks per seed with postcard notification on discovery**: MISSING
- **Poetic place name generator and region title cards**: MISSING
- **Hand-drawn parchment Map (M) with fog-of-war reveal and custom pins**: DONE (`src/ui/map.ts`)
- **Garden plot near spawn for planting collected seeds and flowers**: MISSING

## Milestone 9: Calm Activities & Modes
- **Resting on benches and logs with eased camera pull-back**: DONE (`main.ts`)
- **Stone skipping on lakes with bouncing physics**: MISSING
- **Timing-free relaxing fishing mini-activity**: MISSING
- **Wind chime interactions and campfire lighting / sleeping till morning**: MISSING
- **Photo mode (P) with postcard filters**: PARTIAL (`src/ui/photo-mode.ts` exists but is not wired into `main.ts` input/rendering loop)
- **Calm mode (toggle to hide all UI and let the world play autonomously)**: MISSING

## Verdict on HANDOFF.md and PLAN.md
- **PLAN.md** was incorrect about Milestone 3 (it was actually completed).
- **HANDOFF.md** claimed Milestone 9 (Step 9.2: Photo Mode) was "In progress" or "completed" but it is strictly un-wired and not functional in-game. 
