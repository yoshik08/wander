# MEADOW — Project Handoff

## Current Status
- **Current Milestone**: Milestone 9 (Calm Activities & Modes).
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
  - Milestone C1 (Step C1.2): Procedural Creature Generation (Archetypes, appendages, patterns, 150 species, types).
  - Milestone C1 (Step C1.3): Creature Overworld Spawning (Biome partitioning, roaming AI, depth-sorted rendering).
  - Milestone C1 (Step C1.1): Save State Architecture.
  - Milestone C2 (Step C2.1): Sparring State Machine (Resolve, elements, effectiveness loop).
  - Milestone C2 (Step C2.2): Stats & Moves (Individual creature movesets, species stats).
  - Milestone C3 (Step C3.1): Party leader trailing path and petting interactions.
  - Milestone C3 (Step C3.2): Sanctuary at world 0,0 and UI to swap creatures.
  - Milestone C4 (Step C4.1): Resting Crystals and Nomad Camps generation.
  - Milestone C4 (Step C4.2): Waystones and Fast Travel system.
  - Milestone C5 (Step C5.1): Traversal Abilities.
  - Milestone C6 (Step C6.1): Underground noise map for caves with light radius mechanics.
  - Milestone C6 (Step C6.2): 8 Wardens beside elemental monuments and Rival Wanderer encounters with badges and scaling resolve spar.
  - Milestone C7 (Step C7.1): 4 Cardinal Apex creatures behind resonance shrine puzzles and real-time roaming myth Lunaris.
  - Milestone C7 (Step C7.2): Shooting stars at night, auroras in snow biomes, and weather/time-locked creature spawns.
  - Milestone C8 (Step C8.1): Easter Eggs & Secret Systems (Null chromatic glitch shader, Konami code meteor shower, DevTools console ASCII map, 10,000 paces milestone signpost, Yoshik creator outpost at -999,-999, 10-minute idle sleep pile, 50 water clicks waving sprite).
  - Milestone C8 (Step C8.2): QoL Features & World Settings (2x exploration speed toggle with 'T' hotkey, colourblind geometric type glyphs ▲ ● ◆ ■ ⬡, No-Combat peaceful mode, world seed display & URL share link generator with custom seed loading).
  - Milestone 6 (Step 6.3): Four Advancing Seasons (2-in-game-day cycles of Spring, Summer, Autumn, and Winter; seasonal foliage in ArtToolkit: autumn amber/russet oaks and golden birch, winter bare oaks and snow-capped pine tiers, seasonal atmospheric overlay tints).
  - Milestone 6 (Step 6.4): Post-rain Daylight Rainbow (screen-space spectral arc overlay with Red, Orange, Yellow, Green, Cyan, Blue, Violet bands, automatic fade in/out when rain stops during daylight).
  - Milestone 7 (Step 7.3): Ground Wildlife Species (deer grazing/fleeing AI, rabbits hopping cycles, foxes trotting/running, marsh frogs hopping, and nocturnal glowing fireflies integrated into depth-sorted layer 5 and atmosphere).
  - Milestone 8 (Step 8.3): Interactive Journal ('J' toggle, HUD button, parchment album, watercolor keepsake stamps, completion tracker bar, and expedition folio stats logbook).
  - Milestone 8 (Step 8.4): Landmarks & Place Names (poetic region name generator "Apricot Hollow", region boundary title cards, 20 deterministic hidden landmarks, and postcard notifications).
  - Milestone 9 (Step 9.2): Photo Mode & Calm Mode (wired PhotoMode with letterbox frame, 5 postcard filters [Normal, Vintage Film, Watercolor Wash, Polaroid Instant, Golden Dusk], zoom [0.6x to 2.2x], shutter flash + PNG export, dedicated HUD controls, and Calm Mode toggling [C key / button] that hides all UI and engages gentle auto-wandering on idle).
  - Milestone 9 (Step 9.3): Activities: Stone Skipping & Relaxing Fishing (ActivityManager with water proximity detection, parabolic stone skipping physics with concentric impacts & sinking plop, timing-free relaxing fishing state machine with rod/float/line rendering, 8-species catch catalogue, and Journal folio tracking).
  - Milestone 10 (Steps 10.1 & 10.2): Web Audio Synthesis & Generative Music (100% code-generated Web Audio API engine with procedural pink/brown wind noise modulated by weather, spatial river stream bubbler based on water proximity, procedural daylight bird chirps, time-of-day evolving pentatonic pads [Dawn C Major, Afternoon F Lydian, Sunset G Golden, Night A Minor], micro-sound footsteps/ripples/skip taps/fanfare, volume sliders in settings modal, and top HUD audio mute toggle).
  - Milestone 11 (Step 11.1): UI, Touch Controls & Character Customization (Character wardrobe with 8 palette colorways, 4 hats [Beanie, Straw Sunhat, Alpine Beret, Floral Crown], 3 backpacks [Leather Rucksack, Canvas Satchel, Herb Basket], responsive top HUD toolbar with mobile icon collapse, and dual-zone touch controls with zoom-invariant virtual joystick and amber touch action button).
  - Milestone 12 (Step 12.1): Save System, PWA & Offline Support (Resilient localStorage + IndexedDB dual storage, 15-second periodic autosave, visibilitychange and beforeunload triggers, JSON file import/export validation, PWA manifest, procedural SVG icon, and offline Service Worker with stale-while-revalidate caching).
  - Milestone 13 (Step 13.1): Quality Scaler & Accessibility Toggles (QualityScaler with rolling average FPS monitoring, Auto-adaptive dynamic tier step-downs/step-ups, Low/Med/High/Ultra presets adjusting resolution scale, particle caps, grass density, bloom, and god rays; full Accessibility suite with Reduced Motion, High Contrast mode, and keyboard shortcuts).
  - Milestone 9 (Step 9.1): Wind Chimes & Campfire Dawn Sleep (Swaying bronze wind chimes with crystalline audio feedback and ripple sparkles; campfire warming and [Z] sleep till dawn restoring resolve and advancing world clock to morning).
  - Milestone 14 (Step 14.1): Shared Moment Links (Portable URL generator and boot parser capturing seed, coordinates x & y, time of day, and season with 1-click clipboard copy).
  - Milestone 15 (Step 15.1): Final Review, Endurance Memory Leak Tests & Production Release (1,500-frame traversal test confirming strict Chebyshev chunk capping <=121 chunks, bounded particle pooling, zero NaN drift across 4-season cycles, 22 test files with 112 passing tests, and lean 79.8 kB production bundle).
- **Completed in this step**:
  - Milestone W (Step W5): Structures 1–35 (Settlements, ruins, and cozy non-hostile fortresses with Ghibli styling and interactive lore/treasures).
  - Milestone W (Step W6): Structures 36–60 (Ocean POIs and cave/underground landmarks with water-respecting generation).
  - Milestone W (Step W7): Structures 61–90 (Natural wonders and cozy small POIs across all biomes).
  - Milestone W (Step W8): Legendary Structures 91–100 (Legendary celestial/mythic structures with special mechanics).
  - Milestone W (Step W9): Journal, Minimap & Discovery Logging (Painted structure thumbnails in the Journal folio, map icons, and discovery notifications).
  - Milestone W (Step W10): Mobile Performance Pass (Verification on 412x915 and 393x852 viewports, 60fps lock, zero leaks).
- **Current Milestone**: Milestone 3D-6 (Water, rivers, lakes, ocean, waterfalls, swimming) - Completed.
- **Next Item in ROADMAP_3D.md**:
  - **3D-7**: All 26 biomes with smooth blending; seasons and weather.

## How to Run & Verify
1. **Dev Server**: `npm run dev` (running at `http://127.0.0.1:5173/wander/`)
2. **Type Check**: `npx tsc --noEmit`
3. **Build**: `npm run build`
4. **Test**: `npm run test` (22 test files, 112 tests passing)

## Known Bugs / Blockers
- None. Everything builds cleanly with zero errors and 100% test pass rate (22 test files, 112 tests passing). Total bundle size 79.85 kB gzip. Zero external copyrighted assets. Pure WebGL2 / Web Audio synthesis.

