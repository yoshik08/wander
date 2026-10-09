export type QualityPreset = 'auto' | 'low' | 'medium' | 'high' | 'ultra';
export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualityConfig {
  resolutionScale: number;
  particleLimit: number;
  grassDensity: number;
  enableBloom: boolean;
  enableGodRays: boolean;
}

export const TIER_CONFIGS: Record<QualityTier, QualityConfig> = {
  low: {
    resolutionScale: 0.75,
    particleLimit: 120,
    grassDensity: 0.5,
    enableBloom: false,
    enableGodRays: false
  },
  medium: {
    resolutionScale: 0.88,
    particleLimit: 260,
    grassDensity: 0.75,
    enableBloom: false,
    enableGodRays: true
  },
  high: {
    resolutionScale: 1.0,
    particleLimit: 450,
    grassDensity: 0.9,
    enableBloom: true,
    enableGodRays: true
  },
  ultra: {
    resolutionScale: 1.0,
    particleLimit: 750,
    grassDensity: 1.0,
    enableBloom: true,
    enableGodRays: true
  }
};

export class QualityScaler {
  preset: QualityPreset = 'auto';
  currentTier: QualityTier = 'high';
  
  // Accessibility
  reducedMotion: boolean = false;
  highContrast: boolean = false;

  // Frame timing analysis
  private frameTimes: number[] = [];
  private readonly maxSampleCount = 60;
  private underBudgetTimer = 0;
  private overBudgetTimer = 0;
  private currentFps = 60;

  onQualityChange?: (tier: QualityTier, config: QualityConfig) => void;

  constructor(initialPreset: QualityPreset = 'auto', reducedMotion: boolean = false, highContrast: boolean = false) {
    this.preset = initialPreset;
    this.reducedMotion = reducedMotion;
    this.highContrast = highContrast;
    if (this.preset !== 'auto') {
      this.currentTier = this.preset;
    }
  }

  get config(): QualityConfig {
    return TIER_CONFIGS[this.currentTier];
  }

  get fps(): number {
    return this.currentFps;
  }

  setPreset(preset: QualityPreset): void {
    this.preset = preset;
    if (preset !== 'auto') {
      this.applyTier(preset);
    }
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  setHighContrast(enabled: boolean): void {
    this.highContrast = enabled;
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    }
  }

  recordFrame(dtSeconds: number): void {
    if (dtSeconds <= 0) return;
    const dtMs = dtSeconds * 1000;
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length > this.maxSampleCount) {
      this.frameTimes.shift();
    }

    // Compute average frame time
    const sum = this.frameTimes.reduce((acc, v) => acc + v, 0);
    const avgMs = sum / this.frameTimes.length;
    this.currentFps = Math.round(1000 / Math.max(avgMs, 1));

    // Dynamic scaling for 'auto' mode
    if (this.preset === 'auto') {
      // Over budget: taking > 20ms (> 50 FPS drop)
      if (avgMs > 20.0) {
        this.overBudgetTimer += dtSeconds;
        this.underBudgetTimer = 0;
        if (this.overBudgetTimer > 2.5) {
          this.stepDownTier();
          this.overBudgetTimer = 0;
        }
      } else if (avgMs < 11.5) {
        // Super smooth (< 11.5ms = > 85 FPS)
        this.underBudgetTimer += dtSeconds;
        this.overBudgetTimer = 0;
        if (this.underBudgetTimer > 4.0) {
          this.stepUpTier();
          this.underBudgetTimer = 0;
        }
      } else {
        this.underBudgetTimer = 0;
        this.overBudgetTimer = 0;
      }
    }
  }

  private stepDownTier(): void {
    if (this.currentTier === 'ultra') this.applyTier('high');
    else if (this.currentTier === 'high') this.applyTier('medium');
    else if (this.currentTier === 'medium') this.applyTier('low');
  }

  private stepUpTier(): void {
    if (this.currentTier === 'low') this.applyTier('medium');
    else if (this.currentTier === 'medium') this.applyTier('high');
    else if (this.currentTier === 'high') this.applyTier('ultra');
  }

  private applyTier(tier: QualityTier): void {
    if (this.currentTier !== tier) {
      this.currentTier = tier;
      this.onQualityChange?.(this.currentTier, this.config);
    }
  }
}
