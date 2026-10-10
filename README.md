# MEADOW

*An ambitious, cozy 2D top-down nature exploration world built entirely from scratch.*

![Meadow Gameplay](public/icon.svg)

## Overview
MEADOW is a meditative, deeply atmospheric nature simulation where wandering, noticing, collecting, and resting are the sole pursuits. It features a fully procedural, seeded, infinite world filled with biomes, weather systems, dynamic lighting, procedural wildlife, and gentle interactions.

Built with modern WebGL2 (and an automatic Canvas 2D fallback), this project contains **zero** external game engines or heavy frameworks. All assets, textures, and sounds are 100% procedurally generated using code.

## Key Features
- **Deterministic World Generation**: Infinite seeded worlds, multi-layer procedural noise, and worker pool chunk streaming.
- **Custom WebGL2 Rendering**: Thin sprite batching pipeline for drawing tens of thousands of quads at 120+ FPS.
- **Dynamic Weather & Seasons**: Real-time cycles of day, night, thunderstorms, clear skies, rainbows, and seasonal transitions.
- **Procedural Wildlife**: Flocking birds, wandering deer, foxes, a cat companion, and procedurally generated species.
- **Activities & Keepsakes**: Fishing, stone skipping, wind chimes, and a full collectible keepsake journal.
- **Procedural Audio**: 100% synthesized Web Audio API soundscapes (binaural wind, spatialized flowing water, generative music).
- **Quality of Life**: Save manager (localStorage/IndexedDB), PWA support, gamepads, touch controls, and accessibility options.

## Getting Started

### Prerequisites
- Node.js

### Installation
1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the local development server

### Building & Testing
- **Production Build**: `npm run build`
- **Tests**: `npm run test`
- **Type Checking**: `npm run typecheck`

## Controls
- **Movement**: WASD, Arrow Keys, or Virtual Joystick on mobile
- **Action/Interact**: `Space`, `E`, or Amber Action Button on mobile
- **Photo Mode**: `P`
- **Journal**: `J`
- **Map**: `M`
- **Calm Mode**: `C` (Hides all UI for auto-wandering)

## Credits
- Created by Yoshik.
- See [CREDITS.md](./CREDITS.md) for more details.