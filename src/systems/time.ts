import { ColorRGBA, lerp } from '../core/math';
import { IRenderer } from '../render/types';

export type TimePhase = 'night' | 'dawn' | 'morning' | 'noon' | 'golden_hour' | 'dusk';

export interface TimePhaseInfo {
  phase: TimePhase;
  name: string;
  hour: number;
  minute: number;
  timeString: string;
  sunElevation: number; // 0 (horizon/below) to 1 (zenith)
  sunAngle: number;     // radians direction of sun cast
  ambientColor: ColorRGBA;
  isNight: boolean;
}

export class TimeSystem {
  // Day length in real seconds (default 24 real minutes = 1440s)
  readonly dayDurationSeconds: number = 1440;
  
  // Current in-game time in hours [0, 24)
  // Default spawn at 8:00 AM (sunny morning meadow)
  currentHour: number = 8.0;
  timeSpeed: number = 1.0;

  // Scratch ColorRGBA for zero-allocation rendering
  private scratchColor: ColorRGBA = { r: 1, g: 1, b: 1, a: 0 };

  constructor(startHour: number = 8.0, dayDurationSeconds: number = 1440) {
    this.currentHour = startHour;
    this.dayDurationSeconds = dayDurationSeconds;
  }

  update(dt: number): void {
    // 24 hours per dayDurationSeconds
    const hoursPerSecond = 24.0 / this.dayDurationSeconds;
    this.currentHour = (this.currentHour + dt * hoursPerSecond * this.timeSpeed) % 24.0;
  }

  getInfo(): TimePhaseInfo {
    const h = this.currentHour;
    const hourInt = Math.floor(h);
    const minuteInt = Math.floor((h - hourInt) * 60);
    const timeString = `${hourInt.toString().padStart(2, '0')}:${minuteInt.toString().padStart(2, '0')}`;

    let phase: TimePhase = 'morning';
    let name = 'Morning';
    let sunElevation = 0.5;
    let sunAngle = 0.5; // shadow skew direction
    let isNight = false;

    // Phase evaluation
    if (h >= 21.0 || h < 4.5) {
      phase = 'night';
      name = 'Moonlit Night';
      sunElevation = 0.0;
      sunAngle = -0.3;
      isNight = true;
    } else if (h >= 4.5 && h < 6.5) {
      phase = 'dawn';
      name = 'Dawn';
      const t = (h - 4.5) / 2.0;
      sunElevation = lerp(0.0, 0.35, t);
      sunAngle = lerp(-1.4, -0.9, t);
    } else if (h >= 6.5 && h < 11.0) {
      phase = 'morning';
      name = 'Morning';
      const t = (h - 6.5) / 4.5;
      sunElevation = lerp(0.35, 0.9, t);
      sunAngle = lerp(-0.9, -0.2, t);
    } else if (h >= 11.0 && h < 15.0) {
      phase = 'noon';
      name = 'Bright Noon';
      sunElevation = 1.0;
      sunAngle = 0.1;
    } else if (h >= 15.0 && h < 18.5) {
      phase = 'golden_hour';
      name = 'Golden Hour';
      const t = (h - 15.0) / 3.5;
      sunElevation = lerp(0.9, 0.3, t);
      sunAngle = lerp(0.2, 1.1, t);
    } else {
      // 18.5 to 21.0
      phase = 'dusk';
      name = 'Dusk';
      const t = (h - 18.5) / 2.5;
      sunElevation = lerp(0.3, 0.0, t);
      sunAngle = lerp(1.1, 1.6, t);
    }

    // Color Tint Interpolation
    // Specs:
    // Dawn: peach #FFDAB9 at 20%
    // Noon: clear light at 0%
    // Dusk: orange-to-purple gradient #E59866 / #8E44AD at ~35%
    // Night: teal #1A2436 at 60%
    const c = this.scratchColor;

    if (h >= 21.0 || h < 4.5) {
      // Teal night overlay #1A2436 at 0.58 alpha
      c.r = 0.10;
      c.g = 0.14;
      c.b = 0.21;
      c.a = 0.58;
    } else if (h >= 4.5 && h < 6.5) {
      // Transition from Night (teal) to Dawn (peach #FFDAB9 at 0.20)
      const t = (h - 4.5) / 2.0;
      c.r = lerp(0.10, 1.00, t);
      c.g = lerp(0.14, 0.85, t);
      c.b = lerp(0.21, 0.72, t);
      c.a = lerp(0.58, 0.20, t);
    } else if (h >= 6.5 && h < 11.0) {
      // Dawn peach to Morning/Noon clear
      const t = (h - 6.5) / 4.5;
      c.r = 1.00;
      c.g = lerp(0.85, 1.00, t);
      c.b = lerp(0.72, 1.00, t);
      c.a = lerp(0.20, 0.00, t);
    } else if (h >= 11.0 && h < 15.0) {
      // Clear daylight
      c.r = 1.0;
      c.g = 1.0;
      c.b = 1.0;
      c.a = 0.0;
    } else if (h >= 15.0 && h < 18.5) {
      // Clear to Golden Hour (amber/peach #FAD7A0 at 0.16)
      const t = (h - 15.0) / 3.5;
      c.r = 0.98;
      c.g = lerp(1.0, 0.84, t);
      c.b = lerp(1.0, 0.62, t);
      c.a = lerp(0.0, 0.16, t);
    } else {
      // 18.5 to 21.0: Dusk to Night (amber/violet to teal #1A2436 at 0.58)
      const t = (h - 18.5) / 2.5;
      c.r = lerp(0.85, 0.10, t);
      c.g = lerp(0.55, 0.14, t);
      c.b = lerp(0.70, 0.21, t);
      c.a = lerp(0.28, 0.58, t);
    }

    return {
      phase,
      name,
      hour: hourInt,
      minute: minuteInt,
      timeString,
      sunElevation,
      sunAngle,
      ambientColor: c,
      isNight
    };
  }

  /**
   * Renders the atmospheric lighting overlay quad matching current time-of-day.
   */
  renderOverlay(
    renderer: IRenderer,
    camX: number,
    camY: number,
    viewWidth: number,
    viewHeight: number,
    zoom: number
  ): void {
    const info = this.getInfo();
    if (info.ambientColor.a < 0.005) return;

    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;
    const margin = 20;

    renderer.drawRect(
      camX - halfW - margin,
      camY - halfH - margin,
      halfW * 2 + margin * 2,
      halfH * 2 + margin * 2,
      info.ambientColor
    );
  }
}
