import { Vec2, vec2 } from './math';

export interface InputState {
  // Normalized move vector (-1 to 1)
  move: Vec2;
  // Booleans
  isRunning: boolean;
  interact: boolean;     // E / Gamepad A / Touch
  interactPressed: boolean; // Just pressed this frame
  journalPressed: boolean;  // J
  mapPressed: boolean;      // M
  photoPressed: boolean;    // P
  filterPressed: boolean;   // F
  actionPressed: boolean;   // Space
  menuPressed: boolean;     // Esc / Gamepad Start
  debugPressed: boolean;    // F3
  calmPressed: boolean;     // C
  sleepPressed: boolean;    // Z
}

export class InputManager {
  private keys: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};

  // Touch virtual joystick
  private touchOrigin: Vec2 | null = null;
  private touchCurrent: Vec2 | null = null;
  private touchMoveVec: Vec2 = vec2(0, 0);
  private touchRun: boolean = false;
  private touchInteractPressed: boolean = false;

  constructor(targetElement?: HTMLElement) {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
    }

    const el = targetElement || (typeof document !== 'undefined' ? document.body : null);
    if (el) {
      el.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      el.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      el.addEventListener('touchend', this.handleTouchEnd, { passive: false });
      el.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.keys[e.code]) {
      this.justPressed[e.code] = true;
    }
    this.keys[e.code] = true;

    // Prevent default browser behavior for game controls
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F3'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys[e.code] = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const halfWidth = window.innerWidth / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < halfWidth) {
        // Left half of screen: virtual joystick
        this.touchOrigin = vec2(touch.clientX, touch.clientY);
        this.touchCurrent = vec2(touch.clientX, touch.clientY);
        this.touchMoveVec = vec2(0, 0);
      } else {
        // Right half of screen: interaction tap
        this.touchInteractPressed = true;
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.touchOrigin) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < window.innerWidth / 2) {
        this.touchCurrent = vec2(touch.clientX, touch.clientY);
        const dx = this.touchCurrent.x - this.touchOrigin.x;
        const dy = this.touchCurrent.y - this.touchOrigin.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 45;

        if (dist > 8) {
          const clamped = Math.min(dist, maxRadius) / maxRadius;
          this.touchMoveVec.x = (dx / dist) * clamped;
          this.touchMoveVec.y = (dy / dist) * clamped;
          // Running if pushed to edge
          this.touchRun = dist > maxRadius * 0.85;
        } else {
          this.touchMoveVec = vec2(0, 0);
          this.touchRun = false;
        }
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const halfWidth = window.innerWidth / 2;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < halfWidth) {
        this.touchOrigin = null;
        this.touchCurrent = null;
        this.touchMoveVec = vec2(0, 0);
        this.touchRun = false;
      }
    }
  }

  poll(): InputState {
    let mx = 0;
    let my = 0;

    // Keyboard movement
    if (this.keys['KeyW'] || this.keys['ArrowUp']) my -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) my += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;

    let isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];

    // Gamepad polling
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = gamepads[0];
    if (pad && pad.connected) {
      const deadzone = 0.18;
      const gx = pad.axes[0] || 0;
      const gy = pad.axes[1] || 0;
      if (Math.abs(gx) > deadzone) mx = gx;
      if (Math.abs(gy) > deadzone) my = gy;

      if (pad.buttons[1] && pad.buttons[1].pressed) isRunning = true; // B or RT
      if (pad.buttons[7] && pad.buttons[7].pressed) isRunning = true; // RT
      if (pad.buttons[0] && pad.buttons[0].pressed) {
        this.touchInteractPressed = true; // A button
      }
    }

    // Touch joystick blending
    if (this.touchOrigin && (this.touchMoveVec.x !== 0 || this.touchMoveVec.y !== 0)) {
      mx = this.touchMoveVec.x;
      my = this.touchMoveVec.y;
      if (this.touchRun) isRunning = true;
    }

    // Normalize diagonal keyboard vectors
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    const interactNow = Boolean(this.keys['KeyE'] || this.touchInteractPressed);
    const interactJustPressed = Boolean(this.justPressed['KeyE'] || this.touchInteractPressed);
    const journalJust = Boolean(this.justPressed['KeyJ']);
    const mapJust = Boolean(this.justPressed['KeyM']);
    const photoJust = Boolean(this.justPressed['KeyP']);
    const filterJust = Boolean(this.justPressed['KeyF']);
    const actionJust = Boolean(this.justPressed['Space']);
    const menuJust = Boolean(this.justPressed['Escape']);
    const debugJust = Boolean(this.justPressed['F3']);
    const calmJust = Boolean(this.justPressed['KeyC']);
    const sleepJust = Boolean(this.justPressed['KeyZ']);

    // Clear single-frame presses
    this.justPressed = {};
    this.touchInteractPressed = false;

    return {
      move: vec2(mx, my),
      isRunning,
      interact: interactNow,
      interactPressed: interactJustPressed,
      journalPressed: journalJust,
      mapPressed: mapJust,
      photoPressed: photoJust,
      filterPressed: filterJust,
      actionPressed: actionJust,
      menuPressed: menuJust,
      debugPressed: debugJust,
      calmPressed: calmJust,
      sleepPressed: sleepJust
    };
  }

  getTouchJoystickDisplay(): { active: boolean; origin: Vec2; current: Vec2 } | null {
    if (!this.touchOrigin || !this.touchCurrent) return null;
    return {
      active: true,
      origin: this.touchOrigin,
      current: this.touchCurrent
    };
  }

  isKeyDown(code: string): boolean {
    return Boolean(this.keys[code] || this.keys[`Key${code.toUpperCase()}`]);
  }

  triggerTouchAction(): void {
    this.touchInteractPressed = true;
  }
}
