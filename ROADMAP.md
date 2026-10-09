# MEADOW — Implementation Roadmap

This roadmap breaks down all remaining milestones into highly specific, ordered tasks. Each task is designed to be small enough for an autonomous agent to implement reliably in one pass. All visual work **MUST** reuse `src/render/art.ts` and the established painterly, no-outline style.

## Milestone 4: Procedural Art, Wind Field & Particles
**Focus**: Expanding the biome visuals using the ArtToolkit and adding atmospheric particles.

### [x] Step 4.1: Extended Biome Palettes & Toolkit Props
- **Action**: Update `src/world/biomes.ts` to include full Ghibli-inspired palettes for the remaining 12 biomes (Pine Forest, Cherry Blossom, etc.) following the new color spec. Add `drawMushroom`, `drawFern`, and `drawShrub` to `ArtToolkit`.
- **Files**: `src/world/biomes.ts`, `src/render/art.ts`, `src/main.ts`
- **Reuse**: `drawDropShadow`, `renderer.drawPolygon`
- **Done When**: All biomes have distinct painterly palettes and new props render correctly without black outlines.

### [x] Step 4.2: Global Wind Field & CPU Particle Pool
- **Action**: Implement a `ParticleSystem` class that manages an array of particles (pollen, petals, leaves). Update `main.ts` to spawn particles based on the current biome and `globalWind`.
- **Files**: `src/systems/particles.ts` (new), `src/main.ts`
- **Reuse**: Pass `globalWind` to the particle system for advection. Use `renderer.drawCircle` and `renderer.drawQuad` for particles.
- **Done When**: Yellow pollen drifts through the meadow and pink petals drift in cherry blossom valleys, respecting wind direction.

### [x] Step 4.3: Dynamic Grass Parting & Ripples
- **Action**: Calculate character position distance in the terrain shader or CPU grass loop to push grass blades away from the player's world position.
- **Files**: `src/main.ts`, `src/render/art.ts`
- **Risk**: *Medium*. Avoid passing a massive array to the shader; compute local parting in CPU or pass player pos as a uniform to a new grass shader.
- **Done When**: Grass blades part as the player walks through them.

---

## Milestone 5: Dynamic Lighting, Shadows & Post-Processing
**Focus**: Time of day and cinematic lighting.

### [x] Step 5.1: Time of Day System & Overlays
- **Action**: Implement a `TimeSystem` that tracks a 24-minute day cycle. Render a fullscreen overlay in `main.ts` using `renderer.drawRect` with blending, matching the spec colors (Dawn: peach 20%, Night: teal 60%).
- **Files**: `src/systems/time.ts` (new), `src/main.ts`
- **Done When**: The screen tint smoothly interpolates between Dawn, Noon, Dusk, and Night.

### [x] Step 5.2: Dynamic Sun Angles & Shadows
- **Action**: Pass a `sunAngle` derived from `TimeSystem` to `ArtToolkit.drawDropShadow`.
- **Files**: `src/main.ts`, `src/render/art.ts`
- **Done When**: All upright objects cast shadows that stretch long at dawn/dusk and sit directly beneath objects at noon.

### [x] Step 5.3: God Rays & Bloom
- **Action**: Add a lightweight post-processing pass or additive blended quads in `webgl2.ts` for god rays penetrating the canopy in forest biomes.
- **Files**: `src/render/webgl2.ts`, `src/main.ts`
- **Risk**: *High*. Multipass rendering might break the thin batched renderer. Use an additive blend quad over the screen instead of a true multipass bloom if performance drops.
- **Done When**: Warm god rays are visible during Dawn/Dusk in forested areas.

---

## Milestone 6: Seasons & Smooth Weather
**Focus**: Dynamic weather states.

### [x] Step 6.1: Weather State Machine
- **Action**: Create `WeatherSystem` with states: clear, breezy, overcast, drizzle, thunderstorm. Drive `globalWind` intensity and screen ambient tint based on the weather.
- **Files**: `src/systems/weather.ts` (new), `src/main.ts`
- **Done When**: Weather can transition randomly every few minutes.

### [x] Step 6.2: Rain & Puddles
- **Action**: Expand `ParticleSystem` to handle high-velocity rain streaks. Use `ArtToolkit` to draw expanding ripple rings on the ground/water.
- **Files**: `src/systems/particles.ts`, `src/render/art.ts`
- **Done When**: Rain particles fall rapidly at an angle matching the wind, with ripples appearing on the ground.

---

## Milestone 7: Procedural Wildlife & The Cat
**Focus**: Ambient life.

### [x] Step 7.1: Flocking Birds & Butterflies
- **Action**: Implement a simple Boids/Steering behavior system for small creatures. Draw them using `ArtToolkit`.
- **Files**: `src/entities/boids.ts` (new), `src/main.ts`, `src/render/art.ts`
- **Done When**: Small flocks of birds circle overhead; butterflies flutter near flowers.

### [x] Step 7.2: The Cat Companion
- **Action**: Create a `Cat` entity with follow and sleep states. Uses the same physics/Verlet rig approach as `Character`.
- **Files**: `src/entities/cat.ts` (new), `src/main.ts`
- **Done When**: A cat spawns, follows the player, and curls into a ball when the player is idle.

---

## Milestone 8: Keepsakes, Journal & Map
**Focus**: Meta-progression and UI.

### [x] Step 8.1: Collectible Keepsakes
- **Action**: Scatter items (feathers, special flowers) during chunk generation. Implement proximity collection.
- **Files**: `src/world/chunk.ts`, `src/entities/character.ts`, `src/main.ts`
- **Done When**: Walking near a keepsake plays a chime (console log for now) and increments a counter.

### [x] Step 8.2: Diegetic Map UI
- **Action**: Pressing 'M' renders a full-screen parchment map over the game. Reveal chunks as they are visited by storing explored coordinates in a Set.
- **Files**: `src/ui/map.ts` (new), `src/main.ts`
- **Done When**: The map accurately reflects the noise-generated biomes of explored chunks.

---

## Milestone 9: Calm Activities & Modes

### [x] Step 9.1: Resting on Benches & Logs
- **Action**: Pressing 'E' or interact button near benches or fallen logs lets the wanderer sit down in a relaxed pose with smoothed camera zoom pull-back, breathing wind sighs, and cat curling up at their feet.
- **Files**: `src/entities/character.ts`, `src/world/chunk.ts`, `src/main.ts`
- **Done When**: Player sits on bench with eased camera pull-out, and stands up on movement.

### Step 9.2: Photo Mode & Calm Autoplay
- **Action**: Pressing 'P' enters letterboxed Photo Mode with pan/zoom and postcard filter toggles (film, watercolour, polaroid, dusk).
- **Files**: `src/ui/photo-mode.ts`, `src/main.ts`
- **Done When**: Clean UI-free snapshot capture with artistic postcard borders.
