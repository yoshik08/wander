# Standing Rules — MEADOW

## Project Overview
- **Project**: MEADOW — an ambitious cozy 2D top-down nature exploration world.
- **Base Path**: `/wander/` everywhere (Vite config, asset URLs, worker scripts, service worker scope, fetches).
- **Target URL**: Served at `yoshik.xyz/wander`.

## Technical Stack & Architecture
- **Framework**: Vite + Strict TypeScript. No React, no external game engines.
- **Rendering**: Custom thin WebGL2 renderer (sprite batching, instancing, custom shaders) with automatic Canvas 2D fallback.
- **Procedural Assets**: 100% code-generated art (procedural painting, noise, shaders) and 100% synthesized audio via Web Audio API. Zero copyrighted assets.
- **Timing & Loop**: Fixed-timestep simulation at 120Hz with render interpolation; `requestAnimationFrame` with elapsed time (never assume 60Hz). Pause when tab is hidden.
- **Determinism**: All world generation and gameplay randomness must use seeded PRNGs (never `Math.random` in world code). Same seed produces identical world on all devices.

## Windows & Dev Environment Rules
- Single dev server running on port **5173**.
- Kill only specific PIDs (e.g. `Stop-Process -Id <pid> -Force`). **NEVER kill `node.exe` blindly.**
- If a step fails 3 times the same way, record it in `NOTES.md` and move on.

## Workflow & Continuity
1. Work autonomously without asking trivial questions.
2. Build ONE item at a time: implement, verify with `npx tsc --noEmit` and `npm run build`, check locally, commit to git, tick off in `PLAN.md`.
3. Update `HANDOFF.md` after every completed item with exact status, next item, known bugs, and how to run.
4. Record all aesthetic and architectural decisions in `NOTES.md`.
5. Capture and critique screenshots at desktop (1280x800) and phone sizes (412x915, 393x852) after each milestone.
