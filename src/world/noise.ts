/*
 * Simplex noise in 2D, 3D and 4D
 * Author: Stefan Gustavson, 2003-2005.
 * Ported to JavaScript by Peter O'Connor, 2014.
 * Ported to TypeScript and adapted for seeding by [Your Name], 2026.
 *
 * This is a direct port of the Java reference implementation available at:
 * http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
 *
 * We have made it seeding-friendly by allowing a custom permutation table.
 */

export class SimplexNoise {
  private grad3: number[][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];
  private p: number[];
  private perm: number[];
  private permMod12: number[];

  constructor(seed: number = 0) {
    this.p = [];
    const source = new Array(256);
    for (let i = 0; i < 256; i++) {
      source[i] = i;
    }
    // Fisher-Yates shuffle
    let rnd = seed;
    for (let i = 255; i >= 0; i--) {
      // Simple LCG
      rnd = (rnd * 9301 + 49297) % 233280;
      const r = rnd / 233280;
      const j = Math.floor(r * (i + 1));
      const temp = source[i];
      source[i] = source[j];
      source[j] = temp;
      this.p[i] = source[i];
    }
    // Remove the need for index wrapping by duplicating the permutation table
    this.perm = new Array(512);
    this.permMod12 = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  // 2D simplex noise
  noise2D(xin: number, yin: number): number {
    const noise2D = (xin: number, yin: number) => {
      const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
      const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
      let n0 = 0.0, n1 = 0.0, n2 = 0.0;
      // Skew the input space to determine which simplex cell we're in
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = xin - X0;
      const y0 = yin - Y0;
      // For the 2D case, the simplex shape is an equilateral triangle.
      // Determine which simplex we are in.
      let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
      if (x0 > y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        i1 = 1; j1 = 0;
      } else { // upper triangle, YX order: (0,0)->(0,1)->(1,1)
        i1 = 0; j1 = 1;
      }
      // Offsets for third (last) corner of simplex in (i,j) coords
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1.0 + 2.0 * G2;
      const y2 = y0 - 1.0 + 2.0 * G2;
      // Work out the hashed gradient indices of the three simplex corners
      const ii = i & 255;
      const jj = j & 255;
      const gi0 = this.permMod12[ii + this.perm[jj]];
      const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
      const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
      // Calculate the contribution from the three corners
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 < 0) {
        n0 = 0.0;
      } else {
        t0 *= t0;
        n0 = t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 < 0) {
        n1 = 0.0;
      } else {
        t1 *= t1;
        n1 = t1 * t1 * (this.grad3[gi1][0] * x1 + this.grad3[gi1][1] * y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 < 0) {
        n2 = 0.0;
      } else {
        t2 *= t2;
        n2 = t2 * t2 * (this.grad3[gi2][0] * x2 + this.grad3[gi2][1] * y2);
      }
      // Add contributions from each corner to get the final noise value.
      // The result is scaled to return values in the interval [-1,1].
      return 70.0 * (n0 + n1 + n2);
    };
    return noise2D(xin, yin);
  }

  // 3D simplex noise
  noise3D(xin: number, yin: number, zin: number): number {
    const noise3D = (xin: number, yin: number, zin: number) => {
      const F3 = 1.0 / 3.0;
      const G3 = 1.0 / 6.0;
      let n0 = 0.0, n1 = 0.0, n2 = 0.0, n3 = 0.0;
      // Skew the input space to determine which simplex cell we're in
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const X0 = i - t;
      const Y0 = j - t;
      const Z0 = k - t;
      const x0 = xin - X0;
      const y0 = yin - Y0;
      const z0 = zin - Z0;
      // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
      // Determine which simplex we are in.
      let i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
      let i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
      if (x0 >= y0) {
        if (y0 >= z0) {
          i1 = 1; j1 = 0; k1 = 0;
          i2 = 1; j2 = 1; k2 = 0;
        } else if (x0 >= z0) {
          i1 = 1; j1 = 0; k1 = 0;
          i2 = 1; j2 = 0; k2 = 1;
        } else {
          i1 = 0; j1 = 0; k1 = 1;
          i2 = 1; j2 = 0; k2 = 1;
        }
      } else {
        if (y0 < z0) {
          i1 = 0; j1 = 0; k1 = 1;
          i2 = 0; j2 = 1; k2 = 1;
        } else if (x0 < z0) {
          i1 = 0; j1 = 1; k1 = 0;
          i2 = 0; j2 = 1; k2 = 1;
        } else {
          i1 = 0; j1 = 1; k1 = 0;
          i2 = 1; j2 = 0; k2 = 1;
        }
      }
      // Offsets for fourth corner of simplex in (i,j,k) coords
      const x1 = x0 - i1 + G3;
      const y1 = y0 - j1 + G3;
      const z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2.0 * G3;
      const y2 = y0 - j2 + 2.0 * G3;
      const z2 = z0 - k2 + 2.0 * G3;
      const x3 = x0 - 1.0 + 3.0 * G3;
      const y3 = y0 - 1.0 + 3.0 * G3;
      const z3 = z0 - 1.0 + 3.0 * G3;
      // Work out the hashed gradient indices of the four simplex corners
      const ii = i & 255;
      const jj = j & 255;
      const kk = k & 255;
      const gi0 = this.permMod12[ii + this.perm[jj + this.perm[kk]]];
      const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]];
      const gi2 = this.permMod12[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]];
      const gi3 = this.permMod12[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]];
      // Calculate the contribution from the four corners
      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 < 0) {
        n0 = 0.0;
      } else {
        t0 *= t0;
        n0 = t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0 + this.grad3[gi0][2] * z0);
      }
      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 < 0) {
        n1 = 0.0;
      } else {
        t1 *= t1;
        n1 = t1 * t1 * (this.grad3[gi1][0] * x1 + this.grad3[gi1][1] * y1 + this.grad3[gi1][2] * z1);
      }
      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 < 0) {
        n2 = 0.0;
      } else {
        t2 *= t2;
        n2 = t2 * t2 * (this.grad3[gi2][0] * x2 + this.grad3[gi2][1] * y2 + this.grad3[gi2][2] * z2);
      }
      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 < 0) {
        n3 = 0.0;
      } else {
        t3 *= t3;
        n3 = t3 * t3 * (this.grad3[gi3][0] * x3 + this.grad3[gi3][1] * y3 + this.grad3[gi3][2] * z3);
      }
      // Add contributions from each corner to get the final noise value.
      // The result is scaled to return values in the interval [-1,1].
      return 32.0 * (n0 + n1 + n2 + n3);
    };
    return noise3D(xin, yin, zin);
  }
}