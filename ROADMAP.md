# MEADOW — Implementation Roadmap

This roadmap breaks down all remaining milestones into highly specific, ordered tasks. Each task is designed to be small enough for an autonomous agent to implement reliably in one pass. All visual work **MUST** reuse `src/render/art.ts` and the established painterly, no-outline style.

## Milestone 6: Seasons & Smooth Weather (Remaining)
**Focus**: Finishing seasonal transitions and atmospheric details.

### Step 6.3: Four Advancing Seasons
- **Action**: Add a season tracker to `TimeSystem` that cycles every 2 in-game days. Update `biomes.ts` palettes and `art.ts` vegetation variants based on the current season (e.g., bare trees in winter, orange leaves in autumn).
- **Files**: `src/systems/time.ts`, `src/world/biomes.ts`, `src/render/art.ts`, `src/main.ts`
- **Reuse**: existing color structs.
- **Done When**: The world visually transitions between spring, summer, autumn, and winter over time.
- **Risk**: *Medium*. Interpolating entire palettes could be heavy.

### Step 6.4: Post-rain Daylight Rainbow
- **Action**: Add a screen-space rainbow overlay that fades in for 1 in-game minute after rain ends if the time is dawn, morning, or late afternoon.
- **Files**: `src/systems/weather.ts`, `src/render/webgl2.ts`, `src/main.ts`
- **Reuse**: `renderer.drawRect` with a custom rainbow fragment shader or additive blended rings.
- **Done When**: A subtle rainbow arc appears after rain.

---

## Milestone 7: Procedural Wildlife (Remaining)
**Focus**: Expanded ambient life.

### Step 7.3: Ground Wildlife Species
- **Action**: Expand `boids.ts` to include ground creatures like deer, rabbits, and foxes that flee when approached too quickly. Add night-specific fireflies and frogs.
- **Files**: `src/entities/boids.ts`, `src/render/art.ts`
- **Done When**: Deer can be seen grazing and running away; fireflies appear at night.

---

## Milestone 8: Keepsakes, Journal & Map (Remaining)
**Focus**: Lore and meta-progression.

### Step 8.3: Interactive Journal
- **Action**: Press 'J' to render an interactive journal UI overlay (using `canvas2d.ts` or DOM) that logs collected keepsakes with date found and watercolour stamps.
- **Files**: `src/ui/journal.ts` (new), `src/main.ts`
- **Done When**: The journal shows all found keepsakes.

### Step 8.4: Landmarks & Place Names
- **Action**: Generate poetic place names ("Apricot Hollow"). Detect when player enters a region with a hidden landmark and show a postcard notification.
- **Files**: `src/world/chunk.ts`, `src/ui/journal.ts`, `src/main.ts`
- **Done When**: Notifications appear with generated poetic names upon discovering a new region.

### Step 8.5: Garden Plot
- **Action**: Add a specialized dirt patch near spawn (0,0) where players can plant seeds found in the world.
- **Files**: `src/world/chunk.ts`, `src/main.ts`
- **Done When**: A garden patch exists and player can interact to plant seeds.

---

## Milestone 9: Calm Activities & Modes (Remaining)

### Step 9.2: Photo Mode & Calm Autoplay
- **Action**: Wire up the existing `src/ui/photo-mode.ts` in `main.ts`. Press 'P' to enter letterboxed Photo Mode, allowing pan/zoom and filter toggling. Add 'Calm mode' to hide UI.
- **Files**: `src/main.ts`, `src/ui/photo-mode.ts`
- **Done When**: Pressing 'P' successfully pauses/alters the game view into a cinematic framer with working filters.

### Step 9.3: Activities (Skipping & Fishing)
- **Action**: Implement stone skipping with bouncing physics on water bodies. Add timing-free fishing at docks/shores.
- **Files**: `src/entities/character.ts`, `src/main.ts`
- **Done When**: The player can skip stones and sit with a fishing rod.

---

## Milestone 10: Web Audio & Generative Music
**Focus**: Procedural Sound.

### Step 10.1: Synthesized Engine & Spatial Ambience
- **Action**: Build `AudioSystem` using Web Audio API for spatialized wind, water, and bird calls.
- **Files**: `src/audio/engine.ts` (new)
- **Risk**: *High*. Audio contexts require user interaction to unlock.
- **Done When**: Binaural wind and river sounds adjust based on proximity and weather.

### Step 10.2: Generative Music & Micro-sounds
- **Action**: Synthesize pentatonic pads and bells tuned to time of day. Add UI sound effects.
- **Files**: `src/audio/engine.ts`
- **Done When**: Ethereal music plays dynamically based on time of day.

---

## Milestone 11-15: Polish & Release
- **Step 11.1**: UI and Touch Controls (Virtual joysticks, responsive typography).
- **Step 12.1**: Save System (localStorage/IndexedDB) and PWA manifest.
- **Step 13.1**: Quality Scaler & Accessibility toggles.
- **Step 15.1**: Final visual review and memory leak tests.

---

## Milestone C1: State and Procedural Creatures
**Focus**: Saving and Creature Generation.

### Step C1.1: Save State Architecture
- [x] **Action**: Implement a robust save manager (`src/systems/save.ts`) handling Folio (seen/befriended), Party (up to 6), Sanctuary list, items, and badges. Must support export/import to file.
- **Files**: `src/systems/save.ts` (new)
- **Done When**: Game state can be exported as JSON and re-imported successfully.

### Step C1.2: Procedural Creature Generation
- **Action**: Create a `CreatureSystem`. Generate 150 species using `hash(seed+id)`. Determine archetype (quadruped, biped, serpent, avian, blob), appendages, type-locked hue ranges, and noise patterns (fur/scales/bark). Generate names via a syllable grammar.
- **Files**: `src/entities/creature.ts` (new), `src/render/art.ts`
- **Risk**: *High*. Procedural drawing of diverse archetypes requires careful skeletal assembly in `art.ts` to avoid looking messy.
- **Done When**: Console logs valid procedural creature data; 150 distinct species are generated deterministically.

### Step C1.3: Creature Overworld Spawning [x]
- **Action**: Span 1-3 creatures per chunk based on biome/time/weather. Add idle bob/blink animations.
- **Files**: `src/world/chunk.ts`, `src/main.ts`, `src/render/art.ts`
- **Done When**: Creatures visually roam the map, correctly rendered using the art toolkit. No random pop-ups.

---

## Milestone C2: Sparring

### Step C2.1: In-World Sparring State Machine
- [x] **Action**: Implement turn-based spar flow. No screen change; camera eases closer. Replace HP with "Resolve"; at 0 the creature yields and sits. 5 elemental types with effectiveness loop.
- **Files**: `src/systems/sparring.ts` (new), `src/main.ts`
- **Done When**: Player can engage a wild creature, ease camera in, and take turns resolving attacks until one yields.

### Step C2.2: Stats & Moves
- [x] **Action**: Generate Vigor, Strike, Guard, Haste from species seed. Implement 4 move slots, learned by level, with same-type/weather bonuses and statuses (Sleep, Daze, Rooted). Add Resonance Lure logic to befriend.
- **Files**: `src/systems/sparring.ts`, `src/entities/creature.ts`
- **Done When**: Math correctly resolves attack damage based on typing and stats. Befriending works.

---

## Milestone C3: Party and Sanctuary
- [x] **Step C3.1**: Party leader trailing path and petting interactions.
- [x] **Step C3.2**: Sanctuary at world 0,0 and UI to swap creatures.

---

## Milestone C4: World POIs
- **Step C4.1**: Resting Crystals and Nomad Camps generation.
- **Step C4.2**: Waystones and Fast Travel system.

---

## Milestone C5: Traversal Abilities
- **Step C5.1**: Glide over water (Aqua), clear brambles (Flora), push boulders (Terra), hop gaps (Aero), light caves (Ignis).

---

## Milestone C6: Caves and Wardens
- **Step C6.1**: Underground noise map for caves with light radius mechanics.
- **Step C6.2**: 8 Wardens and Rival Wanderer encounters.

---

## Milestone C7: Rare Things and Atmosphere
- **Step C7.1**: 4 Apex creatures and time-based roaming myths.
- **Step C7.2**: Shooting stars, auroras, and weather-locked spawns.

---

## Milestone C8: Easter Eggs and QoL
- **Step C8.1**: Glitch shaders, meteor showers, dev tools map.
- **Step C8.2**: 2x speed, colourblind icons, No-Combat mode.
