# MEADOW — Implementation Plan

Checklist of all tasks grouped by milestone. Check off items as they are completed.

---

## Milestone 0: Clean Slate & Build Foundation
- [x] Initialize clean `package.json` with Vite, TypeScript, and Vitest
- [x] Configure `tsconfig.json` with strict TypeScript checks
- [x] Configure `vite.config.ts` with base `/wander/` and worker bundle options
- [x] Setup `index.html` with fullscreen viewport, manifest, and canvas container
- [x] Establish directory structure (`src/core/`, `src/render/`, `src/world/`, `src/entities/`, `src/audio/`, `src/ui/`, `src/systems/`)

---

## Milestone 1: Renderer, Fixed Loop, Camera & Character Rig
- [x] Custom WebGL2 thin renderer with batched quads/sprites and shader pipeline
- [x] Automatic robust Canvas 2D fallback when WebGL2 context is unavailable
- [x] High-precision 120Hz fixed-timestep game loop with render interpolation and hidden-tab pause
- [x] DevicePixelRatio support, window resizing, and sub-pixel camera easing with lookahead
- [x] Multi-input system (WASD, Arrow keys, Gamepad, Touch controls)
- [x] Character bone rig (head, body, arms, legs, scarf, backpack) with 8-directional rendering
- [x] Verlet cloth simulation for scarf and hair responding to wind and motion
- [x] Smooth acceleration, deceleration, turn lean, and ground interaction
- [x] Local build and screenshot review on desktop (1280x800) and mobile (412x915, 393x852)

---

## Milestone 2: Seeded Infinite World & Worker Streaming
- [x] Seeded PRNG suite (MurmurHash3 / Mulberry32 / SplitMix64) supporting text and numeric seeds
- [x] Seed in URL parameter (`?seed=...`) with deterministic generation across devices
- [x] Multi-layer noise pipeline (continentalness, elevation, moisture, temperature, erosion, domain warping)
- [x] Web Worker pool for procedural chunk generation (32x32 tiles) with transferable buffers
- [x] Synchronous spawn chunk generation so frame 1 is never empty
- [x] Dynamic chunk streaming (load/unload radius) with flat memory footprint
- [x] Collision mapping (traversable vs blocked tiles)
- [x] Traversability verification test across 500 random seeds (spawn pocket prevention)

---

## Milestone 3: Hydrology, Water Shader, Paths & Structures
- [x] Downhill river flow network from springs to lakes and sea with real flow vectors
- [x] Waterfalls where water bodies meet elevation drops
- [x] Water shader (shimmer, depth tint, flow mapping, shoreline foam, reflections)
- [x] Canvas 2D fallback water effect
- [x] Procedural path network connecting points of interest
- [x] Wooden bridges over streams and stone stepping stones
- [x] Sparse deterministic structures (windmill, lighthouse, ruins, tiny cottage, stone circles, campfire sites, benches)

---

## Milestone 3.5: Art Direction Polish (Ghibli Style)
- [x] Terrain shader core: domain-warped edges, macro colour noise, new palette
- [x] Smooth marching-squares shorelines, continuous rivers, water shader with foam/caustics
- [x] Reusable art toolkit: painted tree/rock/flower/grass, shared wind uniform, soft drop shadows
- [x] Character and tree redesign: 48px/64px scale, painterly no-outline style
- [x] Visual critique in NOTES.md

---

## Milestone 4: Procedural Art, Wind Field & Particles
- [x] 13 unique biomes with handcrafted procedural color palettes and ground textures
  - Meadow, wildflower fields, birch grove, deep pine forest, cherry blossom valley,
  - Rocky rises/cliffs, ponds & marsh, lakes, sandy coast, autumn maple woods,
  - Misty highlands, rare snowy peaks, rare glowing mushroom hollow
- [x] Procedural vegetation: wind-bent grass, wild flowers, layered swaying trees, ferns, mushrooms
- [x] Depth sorting (Y-sorting) for all environmental props, structures, and characters
- [x] Global curl-noise wind field driving grass, trees, petals, and scarf coherently
- [x] Particle system (CPU pool + GPU rendering): pollen, petals, leaves, dust, rain, snow, mist, fireflies
- [x] Dynamic grass parting and spring-back around the character; water ripples

---

## Milestone 5: Dynamic Lighting, Shadows & Post-Processing
- [x] Day/night cycle (24 real minutes default, optional sync to local time)
- [x] Time-of-day phases: dawn, morning, noon, golden hour, dusk, moonlit blue night
- [x] 2D normal-mapped directional lighting and soft tree/character drop shadows
- [x] God rays through canopies, bloom on highlights, and point lights (campfires, fireflies, lighthouse beam)
- [x] Post-processing color grading LUT / grading shader with smooth transitions

---

## Milestone 6: Seasons & Smooth Weather
- [ ] 4 advancing seasons: spring blossoms, summer haze, autumn foliage & leaf-fall, winter frost & snow
- [ ] Seasonal variation in biome palettes, tree leaves, and collectible items
- [x] Weather state machine: clear, breezy, overcast, drizzle with forming puddles, morning fog, thunderstorms, snow
- [ ] Post-rain daylight rainbow effect

---

## Milestone 7: Procedural Wildlife & The Cat
- [x] Steering behaviors (flocking, fleeing, wandering, approach)
- [ ] Wildlife species: butterflies, bees, flocking birds, pond ducks, jumping fish, night frogs, deer, rabbits, fox, owls, seagulls, fireflies
- [x] The Cat companion: approach slowly 3 times to befriend, follows player, naps when player sits

---

## Milestone 8: Keepsakes, Journal, Landmarks & Map
- [x] 60+ collectible keepsakes across biomes and seasons with procedural illustrations and poetic notes
- [ ] Interactive Journal (J) with page-turning animation and completion tracker
- [ ] 20 hidden landmarks per seed with postcard notification on discovery
- [ ] Poetic place name generator ("Apricot Hollow", "The Sleeping Pines") and region title cards
- [x] Hand-drawn parchment Map (M) with fog-of-war reveal and custom pins (up to 10)
- [ ] Garden plot near spawn for planting collected seeds and flowers

---

## Milestone 9: Calm Activities & Modes
- [x] Resting on benches and logs with eased camera pull-back
- [ ] Stone skipping on lakes with bouncing physics
- [ ] Timing-free relaxing fishing mini-activity
- [ ] Wind chime interactions and campfire lighting / sleeping till morning
- [ ] Photo mode (P) with postcard filters (film, watercolour, polaroid, dusk)
- [ ] Calm mode (toggle to hide all UI and let the world play autonomously)

---

## Milestone 10: Web Audio Synthesis & Generative Music
- [ ] 100% synthesized audio engine using Web Audio API (zero external audio files)
- [ ] Spatialized biome environmental soundscapes (running stream, rustling wind, distant birds)
- [ ] Generative music system: pentatonic pads, plucked bells, FM tones tuned to time of day & weather
- [ ] Delightful micro-sounds for all player actions, steps, and pickups
- [ ] Volume sliders (master, music, ambience) with iOS user-interaction audio unlock

---

## Milestone 11: UI, Controls & Character Customization
- [ ] Responsive modern typography,HUD, and menu overlays
- [ ] Character customization: 8 colourways, 4 hats, 3 backpacks (persisted)
- [ ] Full control schemes: Keyboard & Mouse, Gamepad with haptics, Touch (virtual joystick + buttons)
- [ ] Viewport testing at 1280x800, 412x915, and 393x852 (portrait and landscape)

---

## Milestone 12: Storage, PWA & Offline Support
- [ ] Save system (localStorage / IndexedDB): player position, world time, season, journal, garden, map, settings
- [ ] Autosave every 15s and on `visibilitychange`
- [ ] Save import / export to JSON file
- [ ] Service worker & manifest for installable PWA with full offline capabilities

---

## Milestone 13: Quality Scaler, Accessibility & Test Suite
- [ ] Automatic quality scaler (adjusting internal resolution, particles, grass density, post-processing on FPS drops)
- [ ] Quality presets (Low, Medium, High, Ultra) in settings
- [ ] Accessibility: reduced motion, high contrast mode, keyboard-only navigation, colourblind-friendly markers
- [ ] Comprehensive Vitest test suite (seed hashing, worker determinism, hydrology downhill flow, 500-seed traversability, save/load)

---

## Milestone 14: Shared Moments Link (Optional)
- [ ] Compact URL share-link encoding (seed + coordinates + time + season + weather)
- [ ] Share moment modal with copy-to-clipboard functionality

---

## Milestone 15: Final Review, Postcard Gallery & Release
- [ ] Long simulated exploration session to measure memory heap and verify zero memory leaks
- [ ] Visual review of all biomes across all seasons and times of day
- [ ] Production build verification (`npm run build` and `npx tsc --noEmit`)
- [ ] Complete documentation: `README.md`, `NOTES.md`, `CREDITS.md`, `HANDOFF.md`

---

## Milestone C1: State and Procedural Creatures
- [x] Save state: Folio (seen/befriended), Party (6), Sanctuary list, items, badges
- [x] Procedural creatures: species 1-150 from hash(seed+id). Archetypes, appendages, type-locked hue ranges, noise patterns
- [x] Drawn with the art toolkit, idle bob/blink animation. Syllable grammar names
- [x] Evolution = same seed, complexity 1.0->2.0 (bigger, more appendages, richer colour)
- [x] Prismatic variant 1/4096 (hue shift + sparkle)
- [x] Roaming wild creatures visible in the overworld: 1-3 per chunk, by biome/time/weather. No random pop-ups

---

## Milestone C2: Sparring
- [x] In-world turn-based spar, no screen change; camera eases closer
- [x] "Resolve" system; at 0 the creature sits and yields (nothing dies). Fleeing always works
- [x] 5 types: Flora, Aqua, Ignis, Terra, Aero, with an effectiveness loop
- [x] Stats: Vigor, Strike, Guard, Haste from the species seed
- [x] 4 moves, learned by level from a seeded movepool; same-type/weather/biome boosts; statuses (Sleep, Daze, Rooted)
- [x] XP and levels; auto-win if 10+ levels higher
- [x] Befriending: a yielded creature can be offered a Resonance Lure to join you

---

## Milestone C3: Party and Sanctuary
- [x] Party leader follows you on a trailing path with smooth steering. Pet/feed by click or tap
- [x] Sanctuary at world 0,0 (with the Ancient Tree landmark) where all extra creatures roam; UI to swap them in and out
- [x] Nicknames

---

## Milestone C4: World POIs
- [x] Resting Crystals that heal the party, placed deterministically and sparsely. Walking slowly also regenerates Resolve
- [x] Nomad Camps at biome edges: tents, a crystal, a trader, a move tutor, NPC dialogue
- [x] Waystones every ~500 tiles; discover them to fast travel from the map. Map custom pins

---

## Milestone C5: Traversal Abilities
- [x] Aqua: glide over water (oceans open up)
- [x] Flora: clear brambles
- [x] Terra: push boulders
- [x] Aero: hop 1-tile gaps
- [x] Ignis: light up dark caves

---

## Milestone C6: Caves and Wardens
- [x] Cave entrances lead to a separate darker underground noise map, with a light radius, rare spawns, and a strong "Alpha" creature at the end
- [x] 8 Wardens beside elemental monuments far from spawn; beating one grants a badge
- [x] A rival, The Wanderer, who appears now and then at your top level +1

---

## Milestone C7: Rare Things and Atmosphere
- [x] 4 Apex creatures at the far cardinal edges, each behind a small puzzle
- [x] One roaming myth whose position changes with real time
- [x] Creatures that only appear in rain, snow or night
- [x] Shooting stars at night; aurora in snow biomes

---

## Milestone C8: Easter Eggs and QoL
- [x] Naming a creature "Null" gives a glitch shader
- [x] Up Up Down Down Left Right triggers a meteor shower
- [x] Sign after walking 10,000 tiles in one direction
- [x] DevTools console ASCII map to a hidden treasure
- [x] Hidden tent at -999,-999 with a creator NPC called Yoshik
- [x] Idle 10 min and your party piles on you to sleep
- [x] Clicking the same water spot 50 times makes something wave and vanish
- [ ] 2x speed toggle, colourblind type icons, a No-Combat mode, seed sharing in the menu
