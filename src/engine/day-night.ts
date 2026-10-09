export interface DayNightSettings {
  // Length of a full day in seconds (default 24 real minutes = 1440 seconds)
  dayLength: number;
  // Start time of day in seconds (0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk)
  startTime: number;
}

export class DayNightCycle {
  private time: number; // time of day in seconds, 0 to dayLength
  private dayLength: number;
  private startTime: number;

  constructor(settings: DayNightSettings = { dayLength: 1440, startTime: 0 }) {
    this.dayLength = settings.dayLength;
    this.startTime = settings.startTime;
    this.time = this.startTime;
  }

  update(dt: number) {
    this.time = (this.time + dt) % this.dayLength;
  }

  /**
   * Get the normalized time of day (0 to 1) where 0 is midnight, 0.25 is dawn, 0.5 is noon, 0.75 is dusk.
   */
  getTimeOfDay(): number {
    return (this.time % this.dayLength) / this.dayLength;
  }

  /**
   * Get the sun/moon position in the sky as an angle from 0 to 2*PI, where 0 is at midnight (straight down?),
   * but we'll define 0 as sunrise? Let's define angle such that at time 0.25 (dawn) the sun is at horizon (angle 0),
   * at 0.5 (noon) the sun is at zenith (angle PI/2), at 0.75 (dusk) sun at horizon (angle PI), and at 0 (midnight) sun at nadir (angle 3*PI/2?).
   * Actually, we want the sun to be visible from dawn to dusk. We'll compute the sun's hour angle.
   * We'll return an object with altitude (angle from horizon) and azimuth (compass direction).
   * For simplicity, we'll just return the altitude (0 to 1) where 0 is below horizon, 1 is zenith.
   * And we'll return whether it's day or night.
   */
  getSunInfo(): { altitude: number; isDay: boolean } {
    const t = this.getTimeOfDay(); // 0 to 1
    // Daytime from 0.25 to 0.75 (dawn to dusk)
    const isDay = t >= 0.25 && t <= 0.75;
    // Altitude: 0 at dawn/dusk, 1 at noon
    let altitude = 0;
    if (isDay) {
      // Map t from [0.25, 0.75] to [0, 1, 0] for altitude
      const dt = (t - 0.25) * 2; // 0 to 1 over daytime
      altitude = Math.sin(dt * Math.PI); // 0 at dt=0, 1 at dt=0.5, 0 at dt=1
    }
    return { altitude, isDay };
  }

  getMoonInfo(): { altitude: number; isNight: boolean } {
    const t = this.getTimeOfDay();
    // Nighttime from 0.75 to 1.25 (mod 1) i.e., dusk to dawn
    let isNight = false;
    let altitude = 0;
    let isMoonUp = false;
    if (t < 0.25 || t > 0.75) {
      isNight = true;
      // Altitude: 0 at dusk/dawn, 1 at midnight
      // We'll use a simple approximation: moon altitude opposite to sun?
      // For simplicity, we'll make moon altitude = 1 - sun altitude during night? Not accurate.
      // Instead, we'll use a similar curve but offset by 0.5.
      const nt = (t + 0.5) % 1; // shift by half a day
      isMoonUp = nt >= 0.25 && nt <= 0.75;
      if (isMoonUp) {
        const dt = (nt - 0.25) * 2;
        altitude = Math.sin(dt * Math.PI);
      } else {
        altitude = 0;
      }
    }
    return { altitude, isNight: isNight }; // isMoonUp indicates moon is above horizon
  }

  /**
   * Get sky color gradient as [topColor, bottomColor] in RGB format strings.
   * We'll interpolate between colors based on time of day.
   */
  getSkyColors(): [string, string] {
    const t = this.getTimeOfDay();
    // Define colors for key times: midnight, dawn, noon, dusk
    const midnight = [0, 0, 20]; // dark blue
    const dawn = [255, 120, 0]; // orange
    const noon = [135, 206, 250]; // light blue
    const dusk = [255, 100, 0]; // deep orange
    let topColor: number[], bottomColor: number[];
    if (t < 0.25) {
      // midnight to dawn
      const lt = t * 4; // 0 to 1
      topColor = this.lerpColor(midnight, dawn, lt);
      bottomColor = this.lerpColor([0,0,0], [30,30,30], lt); // very dark to slightly less dark
    } else if (t < 0.5) {
      // dawn to noon
      const lt = (t - 0.25) * 4; // 0 to 1
      topColor = this.lerpColor(dawn, noon, lt);
      bottomColor = this.lerpColor([30,30,30], [135,206,250], lt);
    } else if (t < 0.75) {
      // noon to dusk
      const lt = (t - 0.5) * 4; // 0 to 1
      topColor = this.lerpColor(noon, dusk, lt);
      bottomColor = this.lerpColor([135,206,250], [255,100,0], lt);
    } else {
      // dusk to midnight
      const lt = (t - 0.75) * 4; // 0 to 1
      topColor = this.lerpColor(dusk, midnight, lt);
      bottomColor = this.lerpColor([255,100,0], [0,0,20], lt);
    }
    return [
      `rgb(${topColor[0]},${topColor[1]},${topColor[2]})`,
      `rgb(${bottomColor[0]},${bottomColor[1]},${bottomColor[2]})`
    ];
  }

  /**
   * Get ambient light multiplier (0 to 1) for scaling colors in shade.
   */
  getAmbientLight(): number {
    const t = this.getTimeOfDay();
    // Daytime is 0.25 (6am) to 0.75 (6pm)
    if (t >= 0.25 && t <= 0.75) {
      return 1.0;
    }
    // Dawn transition (5am - 6am)
    if (t > 0.20 && t < 0.25) {
      return 0.8 + (t - 0.20) * 4 * 0.2;
    }
    // Dusk transition (6pm - 7pm)
    if (t > 0.75 && t < 0.80) {
      return 1.0 - (t - 0.75) * 4 * 0.2;
    }
    // Night ambient light
    return 0.8;
  }

  private lerpColor(a: number[], b: number[], t: number): number[] {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }
}