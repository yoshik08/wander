import { ColorRGBA, lerp } from '../core/math';
import { PRNG } from '../core/prng';
import { IRenderer } from '../render/types';

export type WeatherState = 'clear' | 'breezy' | 'overcast' | 'drizzle' | 'thunderstorm' | 'fog';

export interface WeatherInfo {
  state: WeatherState;
  name: string;
  windMultiplier: number;
  cloudCoverage: number; // 0 to 1
  ambientTint: ColorRGBA;
  isRaining: boolean;
  isStormy: boolean;
  lightningFlash: number; // 0 to 1 intensity
}

export class WeatherSystem {
  currentState: WeatherState = 'clear';
  targetState: WeatherState = 'clear';
  transitionProgress: number = 1.0; // 0 (current) to 1 (target reached)
  transitionDuration: number = 15.0; // 15 seconds smooth crossfade

  stateTimer: number = 180.0; // Time remaining in current state (e.g. 3 minutes)
  private prng: PRNG;

  // Lightning system for thunderstorms
  private lightningTimer: number = 14.0;
  private lightningIntensity: number = 0.0;

  // Scratch memory for zero-allocation rendering
  private scratchTint: ColorRGBA = { r: 1, g: 1, b: 1, a: 0 };
  private scratchLightningColor: ColorRGBA = { r: 1, g: 1, b: 1, a: 0 };

  constructor(seed: number = 8888, startWeather: WeatherState = 'clear') {
    this.prng = new PRNG(seed);
    this.currentState = startWeather;
    this.targetState = startWeather;
    this.stateTimer = 150.0 + this.prng.next() * 120.0; // 2.5 to 4.5 minutes
  }

  update(dt: number): void {
    // 1. Advance state duration timer
    this.stateTimer -= dt;
    if (this.stateTimer <= 0 && this.transitionProgress >= 1.0) {
      this.pickNextWeather();
    }

    // 2. Smooth weather crossfade
    if (this.transitionProgress < 1.0) {
      this.transitionProgress += dt / this.transitionDuration;
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
        this.currentState = this.targetState;
        this.stateTimer = 180.0 + this.prng.next() * 180.0; // 3 to 6 minutes
      }
    }

    // 3. Lightning flash simulation
    if (this.currentState === 'thunderstorm' || this.targetState === 'thunderstorm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningIntensity = 0.85 + this.prng.next() * 0.15;
        this.lightningTimer = 12.0 + this.prng.next() * 18.0; // next flash in 12-30s
      }
    }

    if (this.lightningIntensity > 0) {
      this.lightningIntensity -= dt * 4.5; // Rapid decay
      if (this.lightningIntensity < 0) this.lightningIntensity = 0;
    }
  }

  private pickNextWeather(): void {
    // Natural state transition graph
    const current = this.currentState;
    let next: WeatherState = 'clear';

    const roll = this.prng.next();

    switch (current) {
      case 'clear':
        if (roll < 0.45) next = 'breezy';
        else if (roll < 0.80) next = 'overcast';
        else next = 'fog';
        break;

      case 'breezy':
        if (roll < 0.50) next = 'clear';
        else if (roll < 0.85) next = 'overcast';
        else next = 'drizzle';
        break;

      case 'overcast':
        if (roll < 0.40) next = 'drizzle';
        else if (roll < 0.70) next = 'clear';
        else if (roll < 0.90) next = 'breezy';
        else next = 'fog';
        break;

      case 'drizzle':
        if (roll < 0.45) next = 'thunderstorm';
        else if (roll < 0.80) next = 'overcast';
        else next = 'clear';
        break;

      case 'thunderstorm':
        if (roll < 0.60) next = 'drizzle';
        else next = 'overcast';
        break;

      case 'fog':
        if (roll < 0.60) next = 'clear';
        else next = 'overcast';
        break;
    }

    this.targetState = next;
    this.transitionProgress = 0.0;
  }

  private getStateParams(state: WeatherState): {
    windMult: number;
    clouds: number;
    r: number;
    g: number;
    b: number;
    a: number;
    isRain: boolean;
    isStorm: boolean;
  } {
    switch (state) {
      case 'clear':
        return { windMult: 1.0, clouds: 0.1, r: 1.0, g: 1.0, b: 1.0, a: 0.0, isRain: false, isStorm: false };
      case 'breezy':
        return { windMult: 2.2, clouds: 0.25, r: 0.95, g: 0.98, b: 1.0, a: 0.04, isRain: false, isStorm: false };
      case 'overcast':
        return { windMult: 1.2, clouds: 0.85, r: 0.62, g: 0.68, b: 0.75, a: 0.18, isRain: false, isStorm: false };
      case 'drizzle':
        return { windMult: 1.4, clouds: 0.90, r: 0.52, g: 0.58, b: 0.68, a: 0.25, isRain: true, isStorm: false };
      case 'thunderstorm':
        return { windMult: 2.8, clouds: 1.0, r: 0.30, g: 0.35, b: 0.48, a: 0.38, isRain: true, isStorm: true };
      case 'fog':
        return { windMult: 0.7, clouds: 0.75, r: 0.85, g: 0.90, b: 0.92, a: 0.28, isRain: false, isStorm: false };
    }
  }

  getInfo(): WeatherInfo {
    const p1 = this.getStateParams(this.currentState);
    const p2 = this.getStateParams(this.targetState);
    const t = this.transitionProgress;

    const windMultiplier = lerp(p1.windMult, p2.windMult, t);
    const cloudCoverage = lerp(p1.clouds, p2.clouds, t);

    this.scratchTint.r = lerp(p1.r, p2.r, t);
    this.scratchTint.g = lerp(p1.g, p2.g, t);
    this.scratchTint.b = lerp(p1.b, p2.b, t);
    this.scratchTint.a = lerp(p1.a, p2.a, t);

    const isRaining = p1.isRain || p2.isRain;
    const isStormy = p1.isStorm || p2.isStorm;

    const names: Record<WeatherState, string> = {
      clear: 'Clear Skies',
      breezy: 'Breezy',
      overcast: 'Overcast',
      drizzle: 'Gentle Drizzle',
      thunderstorm: 'Thunderstorm',
      fog: 'Morning Mist'
    };

    const activeState = t > 0.5 ? this.targetState : this.currentState;

    return {
      state: activeState,
      name: names[activeState],
      windMultiplier,
      cloudCoverage,
      ambientTint: this.scratchTint,
      isRaining,
      isStormy,
      lightningFlash: this.lightningIntensity
    };
  }

  /**
   * Renders the weather overcast/storm ambient tint and lightning flashes over viewport.
   */
  renderWeatherOverlay(
    renderer: IRenderer,
    camX: number,
    camY: number,
    viewWidth: number,
    viewHeight: number,
    zoom: number
  ): void {
    const info = this.getInfo();
    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;
    const margin = 20;

    // 1. Weather ambient overcast/storm tint
    if (info.ambientTint.a > 0.01) {
      renderer.drawRect(
        camX - halfW - margin,
        camY - halfH - margin,
        halfW * 2 + margin * 2,
        halfH * 2 + margin * 2,
        info.ambientTint
      );
    }

    // 2. Lightning flash screen illumination
    if (info.lightningFlash > 0.02) {
      this.scratchLightningColor.r = 0.95;
      this.scratchLightningColor.g = 0.98;
      this.scratchLightningColor.b = 1.0;
      this.scratchLightningColor.a = info.lightningFlash * 0.65;

      renderer.drawRect(
        camX - halfW - margin,
        camY - halfH - margin,
        halfW * 2 + margin * 2,
        halfH * 2 + margin * 2,
        this.scratchLightningColor
      );
    }
  }
}
