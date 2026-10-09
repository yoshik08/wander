export type WeatherType = 0 | 1 | 2 | 3 | 4 | 5;

export const WeatherType = {
  Clear: 0,
  Breezy: 1,
  LightRain: 2,
  Fog: 3,
  Thunderstorm: 4,
  Snow: 5
} as const;

export interface WeatherSettings {
  // How often weather changes (in seconds)
  changeInterval: number;
  // Probability of each weather type when changing (should sum to 1)
  // Weights for: Clear, Breezy, LightRain, Fog, Thunderstorm, Snow
  weights: number[];
}

export class WeatherSystem {
  private timeSinceChange: number;
  private changeInterval: number;
  private weights: number[];
  private currentWeather: WeatherType;
  private transitionTimer: number; // for smooth transitions
  private transitionDuration: number; // seconds to transition between weather

  constructor(settings: WeatherSettings = { changeInterval: 300, weights: [0.5, 0.2, 0.1, 0.1, 0.05, 0.05] }) {
    this.timeSinceChange = 0;
    this.changeInterval = settings.changeInterval;
    this.weights = settings.weights;
    this.currentWeather = WeatherType.Clear;
    this.transitionTimer = 0;
    this.transitionDuration = 30; // 30 seconds to transition
  }

  public setWeather(weatherType: WeatherType): void {
    this.currentWeather = weatherType;
    // To avoid a transition, we set the transitionTimer to 0 so that getTransitionProgress returns 1.
    this.transitionTimer = 0;
  }

  update(dt: number) {
    this.timeSinceChange += dt;
    if (this.timeSinceChange >= this.changeInterval) {
      this.changeWeather();
      this.timeSinceChange = 0;
    }
    // Update transition timer
    if (this.transitionTimer > 0) {
      this.transitionTimer -= dt;
    }
  }

  private changeWeather() {
    // Randomly select a new weather type based on weights
    let sum = 0;
    for (const w of this.weights) {
      sum += w;
    }
    let r = Math.random() * sum;
    for (let i = 0; i < this.weights.length; i++) {
      r -= this.weights[i];
      if (r <= 0) {
        this.currentWeather = i as WeatherType;
        break;
      }
    }
    // Start transition to new weather
    this.transitionTimer = this.transitionDuration;
  }

  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  /**
   * Get a value between 0 and 1 representing how much we have transitioned to the new weather.
   * 0 means just started transition, 1 means fully transitioned.
   */
  getTransitionProgress(): number {
    if (this.transitionTimer <= 0) {
      return 1;
    }
    return 1 - (this.transitionTimer / this.transitionDuration);
  }

  /**
   * Get rain intensity (0 to 1) based on current weather.
   */
  getRainIntensity(): number {
    switch (this.currentWeather) {
      case WeatherType.LightRain:
        return 0.5 * this.getTransitionProgress();
      case WeatherType.Thunderstorm:
        return 0.8 * this.getTransitionProgress();
      default:
        return 0;
    }
  }

  /**
   * Get snow intensity (0 to 1) based on current weather.
   */
  getSnowIntensity(): number {
    switch (this.currentWeather) {
      case WeatherType.Snow:
        return 0.5 * this.getTransitionProgress();
      default:
        return 0;
    }
  }

  /**
   * Get fog density (0 to 1) based on current weather.
   */
  getFogDensity(): number {
    switch (this.currentWeather) {
      case WeatherType.Fog:
        return 0.5 * this.getTransitionProgress();
      case WeatherType.Thunderstorm:
        return 0.3 * this.getTransitionProgress();
      default:
        return 0;
    }
  }

  /**
   * Get wind speed multiplier based on weather.
   */
  getWindMultiplier(): number {
    switch (this.currentWeather) {
      case WeatherType.Breezy:
        return 1.5 * this.getTransitionProgress();
      case WeatherType.Thunderstorm:
        return 2.0 * this.getTransitionProgress();
      default:
        return 1.0 * this.getTransitionProgress(); // base wind multiplier
    }
  }
}