import { SimplexNoise } from '../world/noise';

export class Wind {
  private time: number;
  private strength: number;
  private directionChangeSpeed: number;
  private gustFrequency: number;
  private gustStrength: number;

  constructor() {
    this.time = 0;
    this.strength = 0.5; // base wind strength
    this.directionChangeSpeed = 0.1; // how fast wind direction changes
    this.gustFrequency = 0.5; // how often gusts occur
    this.gustStrength = 1.0; // strength of gusts
  }

  update(dt: number) {
    this.time += dt;
  }

  /**
   * Get wind vector at a given world position and time.
   * Returns a normalized vector representing wind direction and strength.
   */
  getWind(x: number, y: number, t: number): { dx: number; dy: number } {
    // Use noise to create a turbulent wind field
    const noise = new SimplexNoise(Math.floor(t * 10)); // seed based on time
    // Sample noise at different frequencies to create turbulence
    const nx = noise.noise2D(x * 0.01, y * 0.01 + t * 0.1) * 0.5;
    const ny = noise.noise2D(x * 0.01 + 1000, y * 0.01 + t * 0.1) * 0.5;
    // Base direction changes slowly over time
    const baseAngle = t * this.directionChangeSpeed;
    const baseDx = Math.cos(baseAngle);
    const baseDy = Math.sin(baseAngle);
    // Combine base direction with noise
    const dx = baseDx + nx * 0.5;
    const dy = baseDy + ny * 0.5;
    // Apply gusts
    const gust = Math.sin(t * this.gustFrequency) * 0.5 + 0.5; // 0 to 1
    const strength = this.strength + gust * this.gustStrength;
    // Normalize and scale by strength
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
      dx: (dx / len) * strength,
      dy: (dy / len) * strength
    };
  }
}