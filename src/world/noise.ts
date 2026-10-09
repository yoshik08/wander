import { PRNG } from '../core/prng';

/**
 * 2D Simplex Noise with fractional Brownian motion (fBm) and domain warping.
 * Fast, deterministic, and continuous across infinite coordinates.
 */

export class SimplexNoise {
  private perm: Uint8Array = new Uint8Array(512);
  private permMod12: Uint8Array = new Uint8Array(512);

  private readonly grad3: Float32Array = new Float32Array([
    1, 1, 0,  -1, 1, 0,   1, -1, 0,  -1, -1, 0,
    1, 0, 1,  -1, 0, 1,   1, 0, -1,  -1, 0, -1,
    0, 1, 1,   0, -1, 1,  0, 1, -1,   0, -1, -1
  ]);

  constructor(seed: number | string = 12345) {
    const rng = new PRNG(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    // Fisher-Yates shuffle with seeded PRNG
    for (let i = 255; i > 0; i--) {
      const j = rng.rangeInt(0, i);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0 = 0.0, n1 = 0.0, n2 = 0.0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1 = 0, j1 = 0;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]] * 3;
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]] * 3;
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]] * 3;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      n0 = t0 * t0 * (this.grad3[gi0] * x0 + this.grad3[gi0 + 1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      n1 = t1 * t1 * (this.grad3[gi1] * x1 + this.grad3[gi1 + 1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      n2 = t2 * t2 * (this.grad3[gi2] * x2 + this.grad3[gi2 + 1] * y2);
    }

    // Scale to [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  // Fractional Brownian Motion (fBm)
  fbm2D(x: number, y: number, octaves: number = 4, lacunarity: number = 2.0, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }

    return total / maxValue;
  }

  // Domain Warping for organic, flowing terrain contours
  domainWarp2D(x: number, y: number, warpScale: number = 0.005, warpStrength: number = 40.0): number {
    const qx = this.noise2D(x * warpScale, y * warpScale);
    const qy = this.noise2D((x + 5.2) * warpScale, (y + 1.3) * warpScale);

    const rx = this.noise2D((x + 4.0 * qx + 1.7) * warpScale, (y + 4.0 * qy + 9.2) * warpScale);
    const ry = this.noise2D((x + 4.0 * qx + 8.3) * warpScale, (y + 4.0 * qy + 2.8) * warpScale);

    return this.fbm2D(x + warpStrength * rx, y + warpStrength * ry, 4);
  }
}
