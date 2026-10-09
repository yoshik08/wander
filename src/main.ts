import { createRenderer, IRenderer } from './render';
import { GameLoop } from './core/loop';
import { InputManager } from './core/input';
import { Camera } from './core/camera';
import { Character } from './entities/character';
import { hexToRgba, vec2, Vec2 } from './core/math';

// 1. Initialize Canvas & Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #game-canvas not found');
}

const renderer: IRenderer = createRenderer(canvas);
const camera = new Camera(0, 0);
const player = new Character(0, 0);
const input = new InputManager(canvas);

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

    // Update Player & Physics
    player.update(inputState.move, inputState.isRunning, globalWind, dt);

    // Update Camera with Lookahead
    camera.update(player.pos, player.vel, dt);
  },

  render: (alpha: number) => {
    // Dawn Meadow Background clear color
    renderer.beginFrame(hexToRgba('#3B6334'));

    // Set Camera
    renderer.setCamera(camera.pos.x, camera.pos.y, camera.zoom);

    const time = performance.now() / 1000;

    // ==========================================
    // LAYER 1: Plain Meadow Ground Tiles
    // ==========================================
    const tileSize = 24;
    const viewHalfW = (renderer.width / 2) / camera.zoom + tileSize * 2;
    const viewHalfH = (renderer.height / 2) / camera.zoom + tileSize * 2;

    const startX = Math.floor((camera.pos.x - viewHalfW) / tileSize) * tileSize;
    const endX = Math.ceil((camera.pos.x + viewHalfW) / tileSize) * tileSize;
    const startY = Math.floor((camera.pos.y - viewHalfH) / tileSize) * tileSize;
    const endY = Math.ceil((camera.pos.y + viewHalfH) / tileSize) * tileSize;

    const grassShades = [
      hexToRgba('#4E8243'),
      hexToRgba('#46783C'),
      hexToRgba('#558D4A'),
      hexToRgba('#3F6E35'),
      hexToRgba('#5C9750')
    ];

    for (let y = startY; y <= endY; y += tileSize) {
      for (let x = startX; x <= endX; x += tileSize) {
        // Deterministic integer tile shade
        const tileHash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
        const shadeIndex = Math.floor(tileHash * grassShades.length) % grassShades.length;

        // Draw ground tile
        renderer.drawRect(x, y, tileSize, tileSize, grassShades[shadeIndex]);

        // Subtle decorative grass blade tuft
        if (tileHash > 0.65) {
          const windSway = Math.sin(time * 3 + x * 0.05 + y * 0.05) * 1.5;
          const bladeColor = hexToRgba('#6EB55F', 0.65);
          renderer.drawLine(x + 8, y + 16, x + 8 + windSway, y + 10, 1.5, bladeColor);
          renderer.drawLine(x + 12, y + 16, x + 12 + windSway * 1.2, y + 8, 1.5, bladeColor);
        }
      }
    }

    // ==========================================
    // LAYER 2: Character Rig & Scarf
    // ==========================================
    player.render(renderer, alpha);

    // ==========================================
    // LAYER 3: Touch Virtual Joystick UI
    // ==========================================
    const joy = input.getTouchJoystickDisplay();
    if (joy && joy.active) {
      // Draw joystick in screen space
      const screenOrigin = renderer.screenToWorld(joy.origin.x, joy.origin.y);
      const screenCurrent = renderer.screenToWorld(joy.current.x, joy.current.y);

      renderer.drawCircle(screenOrigin.x, screenOrigin.y, 35, hexToRgba('#FFFFFF', 0.2));
      renderer.drawCircle(screenCurrent.x, screenCurrent.y, 16, hexToRgba('#FFFFFF', 0.5));
    }

    // ==========================================
    // LAYER 4: Debug Overlay (F3)
    // ==========================================
    if (showDebug) {
      const stats = renderer.getStats();
      const dbgOrigin = renderer.screenToWorld(16, 16);

      renderer.drawRect(dbgOrigin.x, dbgOrigin.y, 230, 160, hexToRgba('#000000', 0.75));
      // Note: Text is drawn via HTML overlay or simple debug quads
    }

    renderer.endFrame();
  }
});

// 3. Start Game
loop.start();

console.log('[MEADOW] System initialized successfully. Wandering at dawn.');
