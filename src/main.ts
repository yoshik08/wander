import { createRenderer, IRenderer } from './render';
import { GameLoop } from './core/loop';
import { InputManager } from './core/input';
import { Camera } from './core/camera';
import { Character } from './entities/character';
import { ChunkManager } from './world/chunk-manager';
import { CHUNK_PIXEL_SIZE } from './world/chunk';
import { renderStructure } from './world/structures';
import { hexToRgba, vec2, Vec2 } from './core/math';
import { ArtToolkit } from './render/art';

// 1. Initialize Canvas & Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #game-canvas not found');
}

const renderer: IRenderer = createRenderer(canvas);
const art = new ArtToolkit(renderer);
const camera = new Camera(0, 0);
const player = new Character(CHUNK_PIXEL_SIZE / 2, CHUNK_PIXEL_SIZE / 2); // Center of spawn chunk
camera.snapTo(player.pos.x, player.pos.y);

const input = new InputManager(canvas);
const chunkManager = new ChunkManager();

// Resize handling with devicePixelRatio
function handleResize(): void {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.resize(width, height, dpr);
}
window.addEventListener('resize', handleResize);
handleResize();

// Environmental wind vector
const globalWind: Vec2 = vec2(1.2, 0.4);

// Debug overlay state
let showDebug = false;

// Hook chunk GPU cleanup
chunkManager.onChunkUnloaded = (chunk) => {
  renderer.freeChunk(chunk);
};

// Reusable depth item buffer to prevent per-frame allocations
interface DepthItem {
  baseY: number;
  draw: () => void;
}
const depthItems: DepthItem[] = [];
const debugOverlay = document.getElementById('debug-overlay');

// 2. Fixed Timestep Loop (120 Hz)
const loop = new GameLoop({
  update: (dt: number) => {
    const inputState = input.poll();

    if (inputState.debugPressed) {
      showDebug = !showDebug;
    }

    // Dynamic wind modulation
    const time = performance.now() / 1000;
    globalWind.x = 1.0 + Math.sin(time * 0.8) * 0.6;
    globalWind.y = 0.3 + Math.cos(time * 0.6) * 0.3;

    // Proposed movement with collision detection
    const oldX = player.pos.x;
    const oldY = player.pos.y;

    player.update(inputState.move, inputState.isRunning, globalWind, dt);

    // Collision check: separate X and Y for smooth wall sliding
    const padding = 5.0; // Collision radius around feet
    if (
      !chunkManager.isTraversable(player.pos.x - padding, oldY) ||
      !chunkManager.isTraversable(player.pos.x + padding, oldY) ||
      !chunkManager.isTraversable(player.pos.x, oldY - padding) ||
      !chunkManager.isTraversable(player.pos.x, oldY + padding)
    ) {
      player.pos.x = oldX;
      player.vel.x = 0;
    }

    if (
      !chunkManager.isTraversable(player.pos.x - padding, player.pos.y) ||
      !chunkManager.isTraversable(player.pos.x + padding, player.pos.y) ||
      !chunkManager.isTraversable(player.pos.x, player.pos.y - padding) ||
      !chunkManager.isTraversable(player.pos.x, player.pos.y + padding)
    ) {
      player.pos.y = oldY;
      player.vel.y = 0;
    }

    // Update Camera with Lookahead
    camera.update(player.pos, player.vel, dt);

    // Stream and prune chunks around camera
    chunkManager.update(camera.pos.x, camera.pos.y);
  },

  render: (alpha: number) => {
    // Clear with calm natural deep green
    renderer.beginFrame(hexToRgba('#2A4A28'));

    // Set Camera with smooth sub-pixel interpolation
    const camPos = camera.getInterpolatedPos(alpha);
    renderer.setCamera(camPos.x, camPos.y, camera.zoom);

    const time = performance.now() / 1000;
    const visibleChunks = chunkManager.getVisibleChunks(
      camPos.x,
      camPos.y,
      renderer.width,
      renderer.height,
      camera.zoom
    );

    // ==========================================
    // LAYER 1: Cached Chunk Terrain (Ground, Paths, Riverbeds)
    // ==========================================
    for (const chunk of visibleChunks) {
      renderer.drawChunkTerrain(chunk);
    }

    // ==========================================
    // LAYER 2: Cached Chunk Water Shader Batch
    // ==========================================
    for (const chunk of visibleChunks) {
      renderer.drawChunkWater(chunk, time);
    }

    // ==========================================
    // LAYER 3: Cached Bridges & Stepping Stones over Water
    // ==========================================
    for (const chunk of visibleChunks) {
      renderer.drawChunkOverWater(chunk);
    }

    // ==========================================
    // LAYER 4: Water Reflections
    // ==========================================
    player.renderReflection(renderer, alpha);

    // ==========================================
    // LAYER 5: Y-Sorted Props, Structures & Entities
    // ==========================================
    depthItems.length = 0;

    // Props from visible chunks
    for (const chunk of visibleChunks) {
      const { chunkX, chunkY, data } = chunk;
      const baseWorldX = chunkX * CHUNK_PIXEL_SIZE;
      const baseWorldY = chunkY * CHUNK_PIXEL_SIZE;

      for (const prop of data.props) {
        const px = baseWorldX + prop.x;
        const py = baseWorldY + prop.y;

        if (prop.type === 'oak_tree') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedTree(px, prop.baseY, time, globalWind, 0)
          });
        } else if (prop.type === 'pine_tree') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedTree(px, prop.baseY, time, globalWind, 1)
          });
        } else if (prop.type === 'flower') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedFlower(px, prop.baseY, time, globalWind, prop.variant)
          });
        } else if (prop.type === 'lily_pad') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => {
              const bob = Math.sin(time * 2 + px) * 0.8;
              renderer.drawCircle(px, py + bob, 4.5, hexToRgba('#227733'));
              renderer.drawCircle(px - 1, py - 1 + bob, 1.8, hexToRgba('#FFFFFF'));
            }
          });
        } else if (prop.type === 'rock') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedRock(px, prop.baseY, prop.variant)
          });
        } else if (prop.type === 'log') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => {
              renderer.drawRect(px - 8, py - 3, 16, 6, hexToRgba('#6E2C00'));
              renderer.drawCircle(px + 8, py, 2.5, hexToRgba('#D7CCC8'));
            }
          });
        } else if (prop.type === 'shrub') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawShrub(px, prop.baseY, time, globalWind, prop.variant)
          });
        } else if (prop.type === 'mushroom') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawMushroom(px, prop.baseY, prop.variant, false)
          });
        } else if (prop.type === 'mushroom_glowing') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawMushroom(px, prop.baseY, prop.variant, true)
          });
        } else if (prop.type === 'fern') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawFern(px, prop.baseY, time, globalWind, prop.variant)
          });
        } else if (prop.type === 'birch_tree') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawBirchTree(px, prop.baseY, time, globalWind)
          });
        }
      }

      // Structures from visible chunks
      for (const struct of data.structures) {
        depthItems.push({
          baseY: struct.baseY,
          draw: () => renderStructure(renderer, struct, time, globalWind)
        });
      }
    }

    // Player in Depth sorting
    const p = player.getInterpolatedPos(alpha);
    depthItems.push({
      baseY: p.y,
      draw: () => player.render(renderer, alpha)
    });

    // Sort and Draw
    depthItems.sort((a, b) => a.baseY - b.baseY);
    for (const item of depthItems) {
      item.draw();
    }

    // ==========================================
    // LAYER 6: Touch Virtual Joystick UI
    // ==========================================
    const joy = input.getTouchJoystickDisplay();
    if (joy && joy.active) {
      const screenOrigin = renderer.screenToWorld(joy.origin.x, joy.origin.y);
      const screenCurrent = renderer.screenToWorld(joy.current.x, joy.current.y);

      renderer.drawCircle(screenOrigin.x, screenOrigin.y, 35, hexToRgba('#FFFFFF', 0.2));
      renderer.drawCircle(screenCurrent.x, screenCurrent.y, 16, hexToRgba('#FFFFFF', 0.5));
    }

    // ==========================================
    // LAYER 7: Debug Overlay (F3)
    // ==========================================
    if (debugOverlay) {
      if (showDebug) {
        const stats = renderer.getStats();
        debugOverlay.style.display = 'block';
        debugOverlay.innerHTML = `
          <div style="font-weight: 700; color: #38BDF8; margin-bottom: 4px;">MEADOW [F3 DEBUG]</div>
          <div>FPS: <span style="color: #4ADE80; font-weight: 600;">${loop.fps}</span> (${loop.frameTimeMs.toFixed(1)} ms)</div>
          <div>Sim: 120Hz fixed (interp: ${alpha.toFixed(2)})</div>
          <div>Backend: ${stats.backend.toUpperCase()} (draw calls: ${stats.drawCalls})</div>
          <div>Player: X: ${Math.round(player.pos.x)}, Y: ${Math.round(player.pos.y)}</div>
          <div>Chunks: ${chunkManager.getActiveChunkCount()} (${visibleChunks.length} visible)</div>
          <div>Seed: "${chunkManager.seedRaw}"</div>
        `;
      } else {
        debugOverlay.style.display = 'none';
      }
    }

    renderer.endFrame();
  }
});

// 3. Start Game
loop.start();
console.log(`[MEADOW] Seed: "${chunkManager.seedRaw}" (hash: ${chunkManager.seed}). Wandering at dawn.`);
