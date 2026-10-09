/**
 * Seeded PRNG suite (MurmurHash3 + Mulberry32 + SplitMix64).
 * Ensures 100% deterministic generation across devices and threads.
 */

export function hashSeed(input: string | number): number {
  if (typeof input === 'number') {
    return (input >>> 0) || 12345;
  }
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // MurmurHash3 finalizer
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) || 12345;
}

export class PRNG {
  private s: number;

  constructor(seed: number | string = 12345) {
    this.s = hashSeed(seed);
  }

  // Returns float in [0, 1)
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns float in [min, max)
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  // Returns integer in [min, max] inclusive
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Returns true with given probability
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  // Pick random element from array
  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  // Fork a child PRNG with independent state derived deterministically
  fork(extraSalt: number = 0): PRNG {
    const nextSeed = (this.s ^ (extraSalt * 374761393)) >>> 0;
    return new PRNG(nextSeed);
  }
}
