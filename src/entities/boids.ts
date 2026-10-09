import { Vec2, vec2, ColorRGBA, hexToRgba, lerpAngle, lerp } from '../core/math';
import { PRNG } from '../core/prng';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';

export type WildlifeType = 'bird' | 'butterfly' | 'deer' | 'rabbit' | 'fox' | 'frog' | 'firefly';

export interface BoidAgent {
  active: boolean;
  type: WildlifeType;
  pos: Vec2;
  prevPos: Vec2;
  vel: Vec2;
  altitude: number;
  prevAltitude: number;
  targetAltitude: number;
  angle: number;
  speed: number;
  wingPhase: number;
  wingSpeed: number;
  isGliding: boolean;
  glideTimer: number;
  variant: number;
  // Flocking & territory
  flockId: number;
  homePos: Vec2;
  wanderAngle: number;
  // Perching / idling for butterflies
  isPerched: boolean;
  perchTimer: number;
  // Ground wildlife specific states
  isFleeing: boolean;
  isHopping: boolean;
  hopTimer: number;
  fleeTimer: number;
}

export class WildlifeSystem {
  private readonly maxCreatures = 80;
  private readonly pool: BoidAgent[] = [];
  private prng: PRNG;

  // Scratch memory for zero-allocation flock calculations
  private scratchSep: Vec2 = { x: 0, y: 0 };
  private scratchAli: Vec2 = { x: 0, y: 0 };
  private scratchCoh: Vec2 = { x: 0, y: 0 };
  private scratchSteer: Vec2 = { x: 0, y: 0 };

  // Flock centers for flocking birds
  private flockCenters: Vec2[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ];

  constructor(seed: number = 7777) {
    this.prng = new PRNG(seed);

    // Pre-allocate creature pool
    for (let i = 0; i < this.maxCreatures; i++) {
      this.pool.push({
        active: false,
        type: 'bird',
        pos: vec2(0, 0),
        prevPos: vec2(0, 0),
        vel: vec2(0, 0),
        altitude: 45,
        prevAltitude: 45,
        targetAltitude: 45,
        angle: 0,
        speed: 70,
        wingPhase: 0,
        wingSpeed: 18,
        isGliding: false,
        glideTimer: 1.5,
        variant: 0,
        flockId: 0,
        homePos: vec2(0, 0),
        wanderAngle: 0,
        isPerched: false,
        perchTimer: 0,
        isFleeing: false,
        isHopping: false,
        hopTimer: 0,
        fleeTimer: 0
      });
    }
  }

  /**
   * Initializes ambient birds, butterflies, ground wildlife, and fireflies around the player's spawn region.
   */
  spawnCreaturesAround(originX: number, originY: number): void {
    let index = 0;

    // 1. Spawn 3 Flocks of Birds (5 birds per flock = 15 birds)
    const flockCount = 3;
    for (let f = 0; f < flockCount; f++) {
      const flockHomeX = originX + (this.prng.next() - 0.5) * 600;
      const flockHomeY = originY + (this.prng.next() - 0.5) * 600;
      this.flockCenters[f] = vec2(flockHomeX, flockHomeY);

      const birdsInFlock = 5;
      for (let b = 0; b < birdsInFlock; b++) {
        if (index >= this.maxCreatures) break;
        const agent = this.pool[index++];
        agent.active = true;
        agent.type = 'bird';
        agent.flockId = f;
        agent.homePos.x = flockHomeX;
        agent.homePos.y = flockHomeY;

        const offsetAngle = this.prng.next() * Math.PI * 2;
        const offsetDist = 20 + this.prng.next() * 60;
        agent.pos.x = flockHomeX + Math.cos(offsetAngle) * offsetDist;
        agent.pos.y = flockHomeY + Math.sin(offsetAngle) * offsetDist;
        agent.prevPos.x = agent.pos.x;
        agent.prevPos.y = agent.pos.y;

        agent.altitude = 45 + this.prng.next() * 25;
        agent.prevAltitude = agent.altitude;
        agent.targetAltitude = agent.altitude;

        agent.angle = this.prng.next() * Math.PI * 2;
        agent.speed = 65 + this.prng.next() * 30;
        agent.vel.x = Math.cos(agent.angle) * agent.speed;
        agent.vel.y = Math.sin(agent.angle) * agent.speed;

        agent.wingPhase = this.prng.next() * Math.PI * 2;
        agent.wingSpeed = 16 + this.prng.next() * 6;
        agent.isGliding = false;
        agent.glideTimer = 1.0 + this.prng.next() * 2.0;
        agent.variant = this.prng.rangeInt(0, 2);
        agent.wanderAngle = agent.angle;
      }
    }

    // 2. Spawn Butterflies near flowers & clearings (18 butterflies)
    const butterflyCount = 18;
    for (let i = 0; i < butterflyCount; i++) {
      if (index >= this.maxCreatures) break;
      const agent = this.pool[index++];
      agent.active = true;
      agent.type = 'butterfly';
      agent.flockId = -1;

      const angle = this.prng.next() * Math.PI * 2;
      const dist = 30 + this.prng.next() * 320;
      agent.pos.x = originX + Math.cos(angle) * dist;
      agent.pos.y = originY + Math.sin(angle) * dist;
      agent.prevPos.x = agent.pos.x;
      agent.prevPos.y = agent.pos.y;
      agent.homePos.x = agent.pos.x;
      agent.homePos.y = agent.pos.y;

      agent.altitude = 6 + this.prng.next() * 8;
      agent.prevAltitude = agent.altitude;
      agent.targetAltitude = agent.altitude;

      agent.angle = this.prng.next() * Math.PI * 2;
      agent.speed = 22 + this.prng.next() * 16;
      agent.vel.x = Math.cos(agent.angle) * agent.speed;
      agent.vel.y = Math.sin(agent.angle) * agent.speed;

      agent.wingPhase = this.prng.next() * Math.PI * 2;
      agent.wingSpeed = 18 + this.prng.next() * 8;
      agent.variant = this.prng.rangeInt(0, 4);
      agent.isPerched = this.prng.next() < 0.3;
      agent.perchTimer = 2.0 + this.prng.next() * 3.0;
    }

    // 3. Spawn Deer (4 graceful deer in small clearings)
    const deerCount = 4;
    for (let i = 0; i < deerCount; i++) {
      if (index >= this.maxCreatures) break;
      const agent = this.pool[index++];
      agent.active = true;
      agent.type = 'deer';
      agent.flockId = -1;

      const angle = this.prng.next() * Math.PI * 2;
      const dist = 120 + this.prng.next() * 350;
      agent.pos.x = originX + Math.cos(angle) * dist;
      agent.pos.y = originY + Math.sin(angle) * dist;
      agent.prevPos.x = agent.pos.x;
      agent.prevPos.y = agent.pos.y;
      agent.homePos.x = agent.pos.x;
      agent.homePos.y = agent.pos.y;

      agent.altitude = 0;
      agent.prevAltitude = 0;
      agent.angle = this.prng.next() * Math.PI * 2;
      agent.wanderAngle = agent.angle;
      agent.speed = 15 + this.prng.next() * 10;
      agent.vel.x = Math.cos(agent.angle) * agent.speed;
      agent.vel.y = Math.sin(agent.angle) * agent.speed;
      agent.isFleeing = false;
      agent.fleeTimer = 0;
    }

    // 4. Spawn Rabbits (8 hopping rabbits in meadow grass)
    const rabbitCount = 8;
    for (let i = 0; i < rabbitCount; i++) {
      if (index >= this.maxCreatures) break;
      const agent = this.pool[index++];
      agent.active = true;
      agent.type = 'rabbit';
      agent.flockId = -1;

      const angle = this.prng.next() * Math.PI * 2;
      const dist = 60 + this.prng.next() * 280;
      agent.pos.x = originX + Math.cos(angle) * dist;
      agent.pos.y = originY + Math.sin(angle) * dist;
      agent.prevPos.x = agent.pos.x;
      agent.prevPos.y = agent.pos.y;
      agent.homePos.x = agent.pos.x;
      agent.homePos.y = agent.pos.y;

      agent.altitude = 0;
      agent.prevAltitude = 0;
      agent.angle = this.prng.next() * Math.PI * 2;
      agent.wanderAngle = agent.angle;
      agent.speed = 0;
      agent.isHopping = false;
      agent.hopTimer = 0.5 + this.prng.next() * 1.5;
      agent.isFleeing = false;
      agent.fleeTimer = 0;
    }

    // 5. Spawn Foxes (4 sleek woodland foxes)
    const foxCount = 4;
    for (let i = 0; i < foxCount; i++) {
      if (index >= this.maxCreatures) break;
      const agent = this.pool[index++];
      agent.active = true;
      agent.type = 'fox';
      agent.flockId = -1;

      const angle = this.prng.next() * Math.PI * 2;
      const dist = 140 + this.prng.next() * 320;
      agent.pos.x = originX + Math.cos(angle) * dist;
      agent.pos.y = originY + Math.sin(angle) * dist;
      agent.prevPos.x = agent.pos.x;
      agent.prevPos.y = agent.pos.y;
      agent.homePos.x = agent.pos.x;
      agent.homePos.y = agent.pos.y;

      agent.altitude = 0;
      agent.prevAltitude = 0;
      agent.angle = this.prng.next() * Math.PI * 2;
      agent.wanderAngle = agent.angle;
      agent.speed = 22 + this.prng.next() * 12;
      agent.vel.x = Math.cos(agent.angle) * agent.speed;
      agent.vel.y = Math.sin(agent.angle) * agent.speed;
      agent.isFleeing = false;
      agent.fleeTimer = 0;
    }

    // 6. Spawn Frogs (6 marsh frogs near damp lowlands)
    const frogCount = 6;
    for (let i = 0; i < frogCount; i++) {
      if (index >= this.maxCreatures) break;
      const agent = this.pool[index++];
      agent.active = true;
      agent.type = 'frog';
      agent.flockId = -1;

      const angle = this.prng.next() * Math.PI * 2;
      const dist = 80 + this.prng.next() * 260;
      agent.pos.x = originX + Math.cos(angle) * dist;
      agent.pos.y = originY + Math.sin(angle) * dist;
      agent.prevPos.x = agent.pos.x;
      agent.prevPos.y = agent.pos.y;
      agent.homePos.x = agent.pos.x;
      agent.homePos.y = agent.pos.y;

      agent.altitude = 0;
      agent.prevAltitude = 0;
      agent.angle = this.prng.next() * Math.PI * 2;
      agent.wanderAngle = agent.angle;
      agent.speed = 0;
      agent.isHopping = false;
      agent.hopTimer = 1.0 + this.prng.next() * 2.5;
      agent.isFleeing = false;
    }

    // 7. Spawn Fireflies (16 glowing nocturnal orbs)
    const fireflyCount = 16;
    for (let i = 0; i < fireflyCount; i++) {
      if (index >= this.maxCreatures) break;
      const agent = this.pool[index++];
      agent.active = true;
      agent.type = 'firefly';
      agent.flockId = -1;

      const angle = this.prng.next() * Math.PI * 2;
      const dist = 40 + this.prng.next() * 320;
      agent.pos.x = originX + Math.cos(angle) * dist;
      agent.pos.y = originY + Math.sin(angle) * dist;
      agent.prevPos.x = agent.pos.x;
      agent.prevPos.y = agent.pos.y;
      agent.homePos.x = agent.pos.x;
      agent.homePos.y = agent.pos.y;

      agent.altitude = 8 + this.prng.next() * 12;
      agent.prevAltitude = agent.altitude;
      agent.speed = 10;
      agent.angle = this.prng.next() * Math.PI * 2;
    }
  }

  /**
   * Updates boid steering behaviors, flight physics, ground wildlife AI, and wing animation loops.
   */
  update(
    dt: number,
    time: number,
    playerPos: Vec2,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    zoom: number,
    wind: Vec2
  ): void {
    const halfW = (viewW / 2) / zoom;
    const halfH = (viewH / 2) / zoom;
    const wrapMargin = 380;

    // 1. Advance Flock Center Circling
    for (let f = 0; f < this.flockCenters.length; f++) {
      const fc = this.flockCenters[f];
      const orbitSpeed = 0.12;
      const orbitRadius = 140;
      fc.x += Math.cos(time * orbitSpeed + f * 2.1) * orbitRadius * dt * 0.4 + wind.x * 6 * dt;
      fc.y += Math.sin(time * orbitSpeed + f * 2.1) * (orbitRadius * 0.7) * dt * 0.4 + wind.y * 6 * dt;
    }

    // 2. Update individual agents
    for (let i = 0; i < this.maxCreatures; i++) {
      const a = this.pool[i];
      if (!a.active) continue;

      // Store previous state for smooth render interpolation
      a.prevPos.x = a.pos.x;
      a.prevPos.y = a.pos.y;
      a.prevAltitude = a.altitude;

      switch (a.type) {
        case 'bird':
          this.updateBird(a, dt, time, wind);
          break;
        case 'butterfly':
          this.updateButterfly(a, dt, time, playerPos, wind);
          break;
        case 'deer':
          this.updateDeer(a, dt, playerPos);
          break;
        case 'rabbit':
          this.updateRabbit(a, dt, playerPos);
          break;
        case 'fox':
          this.updateFox(a, dt, playerPos);
          break;
        case 'frog':
          this.updateFrog(a, dt, playerPos);
          break;
        case 'firefly':
          this.updateFirefly(a, dt, time, wind);
          break;
      }

      // Smooth wrap around camera bounds to keep world active and populated
      if (a.pos.x < camX - halfW - wrapMargin) {
        a.pos.x = camX + halfW + wrapMargin - 20;
        a.prevPos.x = a.pos.x;
      } else if (a.pos.x > camX + halfW + wrapMargin) {
        a.pos.x = camX - halfW - wrapMargin + 20;
        a.prevPos.x = a.pos.x;
      }
      if (a.pos.y < camY - halfH - wrapMargin) {
        a.pos.y = camY + halfH + wrapMargin - 20;
        a.prevPos.y = a.pos.y;
      } else if (a.pos.y > camY + halfH + wrapMargin) {
        a.pos.y = camY - halfH - wrapMargin + 20;
        a.prevPos.y = a.pos.y;
      }
    }
  }

  private updateBird(a: BoidAgent, dt: number, time: number, wind: Vec2): void {
    let sepX = 0, sepY = 0, sepCount = 0;
    let aliX = 0, aliY = 0, aliCount = 0;
    let cohX = 0, cohY = 0, cohCount = 0;

    const sepDist = 32;
    const neighborDist = 120;

    for (let j = 0; j < this.maxCreatures; j++) {
      const other = this.pool[j];
      if (!other.active || other === a || other.type !== 'bird' || other.flockId !== a.flockId) continue;

      const dx = other.pos.x - a.pos.x;
      const dy = other.pos.y - a.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < sepDist && dist > 0.01) {
        sepX -= (dx / dist) * (sepDist - dist);
        sepY -= (dy / dist) * (sepDist - dist);
        sepCount++;
      }

      if (dist < neighborDist) {
        aliX += other.vel.x;
        aliY += other.vel.y;
        aliCount++;

        cohX += other.pos.x;
        cohY += other.pos.y;
        cohCount++;
      }
    }

    const fc = this.flockCenters[a.flockId];
    const toHomeX = fc.x - a.pos.x;
    const toHomeY = fc.y - a.pos.y;
    const distToHome = Math.hypot(toHomeX, toHomeY);

    this.scratchSteer.x = 0;
    this.scratchSteer.y = 0;

    if (sepCount > 0) {
      this.scratchSteer.x += sepX * 1.8;
      this.scratchSteer.y += sepY * 1.8;
    }
    if (aliCount > 0) {
      this.scratchSteer.x += (aliX / aliCount - a.vel.x) * 0.8;
      this.scratchSteer.y += (aliY / aliCount - a.vel.y) * 0.8;
    }
    if (cohCount > 0) {
      const avgPosX = cohX / cohCount;
      const avgPosY = cohY / cohCount;
      this.scratchSteer.x += (avgPosX - a.pos.x) * 0.05;
      this.scratchSteer.y += (avgPosY - a.pos.y) * 0.05;
    }

    if (distToHome > 160) {
      this.scratchSteer.x += (toHomeX / distToHome) * 35;
      this.scratchSteer.y += (toHomeY / distToHome) * 35;
    }

    this.scratchSteer.x += wind.x * 12;
    this.scratchSteer.y += wind.y * 8;

    a.vel.x += this.scratchSteer.x * dt * 2.5;
    a.vel.y += this.scratchSteer.y * dt * 2.5;

    const currentSpeed = Math.hypot(a.vel.x, a.vel.y);
    const targetSpeed = 75;
    if (currentSpeed > 0.01) {
      const factor = (targetSpeed / currentSpeed) * Math.min(1.0, 4.0 * dt);
      a.vel.x = lerp(a.vel.x, (a.vel.x / currentSpeed) * targetSpeed, factor);
      a.vel.y = lerp(a.vel.y, (a.vel.y / currentSpeed) * targetSpeed, factor);
    }

    a.pos.x += a.vel.x * dt;
    a.pos.y += a.vel.y * dt;
    a.angle = Math.atan2(a.vel.y, a.vel.x);

    a.altitude = 48 + Math.sin(time * 0.9 + a.flockId * 1.5) * 12;

    a.glideTimer -= dt;
    if (a.glideTimer <= 0) {
      a.isGliding = !a.isGliding;
      a.glideTimer = a.isGliding ? (1.8 + this.prng.next() * 2.0) : (1.2 + this.prng.next() * 1.0);
    }

    if (!a.isGliding) {
      a.wingPhase += a.wingSpeed * dt;
    } else {
      a.wingPhase = lerp(a.wingPhase, 0.2, dt * 5.0);
    }
  }

  private updateButterfly(a: BoidAgent, dt: number, time: number, playerPos: Vec2, wind: Vec2): void {
    if (a.isPerched) {
      a.perchTimer -= dt;
      a.wingPhase += 3.5 * dt;

      const dx = a.pos.x - playerPos.x;
      const dy = a.pos.y - playerPos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 40 || a.perchTimer <= 0) {
        a.isPerched = false;
        a.altitude = 8;
        a.angle = Math.atan2(dy, dx) + (this.prng.next() - 0.5) * 0.8;
        a.speed = 36;
        a.vel.x = Math.cos(a.angle) * a.speed;
        a.vel.y = Math.sin(a.angle) * a.speed;
      }
      return;
    }

    a.wingPhase += a.wingSpeed * dt;
    a.wanderAngle += (this.prng.next() - 0.5) * 6.0 * dt;
    const steerX = Math.cos(a.wanderAngle) * 30 + wind.x * 6;
    const steerY = Math.sin(a.wanderAngle) * 30 + wind.y * 4;

    const toHomeX = a.homePos.x - a.pos.x;
    const toHomeY = a.homePos.y - a.pos.y;
    const distHome = Math.hypot(toHomeX, toHomeY);
    if (distHome > 85) {
      a.vel.x += (toHomeX / distHome) * 25 * dt;
      a.vel.y += (toHomeY / distHome) * 25 * dt;
    }

    const toPlayerX = a.pos.x - playerPos.x;
    const toPlayerY = a.pos.y - playerPos.y;
    const distPlayer = Math.hypot(toPlayerX, toPlayerY);
    if (distPlayer < 45 && distPlayer > 0.01) {
      a.vel.x += (toPlayerX / distPlayer) * 75 * dt;
      a.vel.y += (toPlayerY / distPlayer) * 75 * dt;
    }

    a.vel.x += steerX * dt * 2.0;
    a.vel.y += steerY * dt * 2.0;

    const spd = Math.hypot(a.vel.x, a.vel.y);
    const maxSpd = distPlayer < 45 ? 42 : 24;
    if (spd > maxSpd) {
      a.vel.x = (a.vel.x / spd) * maxSpd;
      a.vel.y = (a.vel.y / spd) * maxSpd;
    }

    a.altitude = 8 + Math.sin(time * 7.5 + a.pos.x * 0.1) * 3.5;
    a.pos.x += a.vel.x * dt;
    a.pos.y += a.vel.y * dt;
    a.angle = Math.atan2(a.vel.y, a.vel.x);

    if (this.prng.next() < 0.003 * dt * 60) {
      a.isPerched = true;
      a.perchTimer = 2.5 + this.prng.next() * 3.5;
      a.altitude = 2;
    }
  }

  private updateDeer(a: BoidAgent, dt: number, playerPos: Vec2): void {
    const dx = a.pos.x - playerPos.x;
    const dy = a.pos.y - playerPos.y;
    const dist = Math.hypot(dx, dy);

    // Flee if player is close
    if (dist < 110) {
      a.isFleeing = true;
      a.fleeTimer = 2.5;
    }

    if (a.isFleeing) {
      a.fleeTimer -= dt;
      const fleeAngle = Math.atan2(dy, dx);
      a.angle = lerpAngle(a.angle, fleeAngle, dt * 7.0);
      a.speed = lerp(a.speed, 115, dt * 6.0);
      if (dist > 250 && a.fleeTimer <= 0) {
        a.isFleeing = false;
      }
    } else {
      // Peaceful grazing and wandering
      a.wanderAngle += (this.prng.next() - 0.5) * 1.5 * dt;
      a.angle = lerpAngle(a.angle, a.wanderAngle, dt * 2.0);
      // Mostly resting or slow walk
      const targetSpeed = this.prng.next() < 0.3 ? 0 : 18;
      a.speed = lerp(a.speed, targetSpeed, dt * 2.0);
    }

    a.pos.x += Math.cos(a.angle) * a.speed * dt;
    a.pos.y += Math.sin(a.angle) * a.speed * dt;
  }

  private updateRabbit(a: BoidAgent, dt: number, playerPos: Vec2): void {
    const dx = a.pos.x - playerPos.x;
    const dy = a.pos.y - playerPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 80) {
      a.isFleeing = true;
      a.fleeTimer = 2.0;
    }

    a.hopTimer -= dt;
    if (a.hopTimer <= 0) {
      if (!a.isHopping) {
        // Begin hop
        a.isHopping = true;
        a.hopTimer = a.isFleeing ? 0.22 : 0.35;
        if (a.isFleeing) {
          a.angle = Math.atan2(dy, dx) + (this.prng.next() - 0.5) * 0.5;
          a.speed = 95;
        } else {
          a.wanderAngle += (this.prng.next() - 0.5) * 2.5;
          a.angle = a.wanderAngle;
          a.speed = 36;
        }
      } else {
        // End hop / landing pause
        a.isHopping = false;
        a.speed = 0;
        a.hopTimer = a.isFleeing ? (0.12 + this.prng.next() * 0.15) : (0.7 + this.prng.next() * 1.5);
        if (a.isFleeing) {
          a.fleeTimer -= 0.3;
          if (dist > 180 && a.fleeTimer <= 0) a.isFleeing = false;
        }
      }
    }

    if (a.isHopping) {
      a.pos.x += Math.cos(a.angle) * a.speed * dt;
      a.pos.y += Math.sin(a.angle) * a.speed * dt;
    }
  }

  private updateFox(a: BoidAgent, dt: number, playerPos: Vec2): void {
    const dx = a.pos.x - playerPos.x;
    const dy = a.pos.y - playerPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 90) {
      a.isFleeing = true;
      a.fleeTimer = 2.2;
    }

    if (a.isFleeing) {
      a.fleeTimer -= dt;
      const fleeAngle = Math.atan2(dy, dx);
      a.angle = lerpAngle(a.angle, fleeAngle, dt * 6.0);
      a.speed = lerp(a.speed, 85, dt * 5.0);
      if (dist > 220 && a.fleeTimer <= 0) {
        a.isFleeing = false;
      }
    } else {
      a.wanderAngle += (this.prng.next() - 0.5) * 1.8 * dt;
      a.angle = lerpAngle(a.angle, a.wanderAngle, dt * 2.5);
      a.speed = lerp(a.speed, 26, dt * 2.0);
    }

    a.pos.x += Math.cos(a.angle) * a.speed * dt;
    a.pos.y += Math.sin(a.angle) * a.speed * dt;
  }

  private updateFrog(a: BoidAgent, dt: number, playerPos: Vec2): void {
    const dx = a.pos.x - playerPos.x;
    const dy = a.pos.y - playerPos.y;
    const dist = Math.hypot(dx, dy);

    // Startle if stepped on
    if (dist < 45 && !a.isHopping) {
      a.isHopping = true;
      a.hopTimer = 0.28;
      a.angle = Math.atan2(dy, dx);
      a.speed = 60;
    }

    a.hopTimer -= dt;
    if (a.hopTimer <= 0) {
      if (!a.isHopping) {
        a.isHopping = true;
        a.hopTimer = 0.26;
        a.wanderAngle += (this.prng.next() - 0.5) * 2.2;
        a.angle = a.wanderAngle;
        a.speed = 42;
      } else {
        a.isHopping = false;
        a.speed = 0;
        a.hopTimer = 1.5 + this.prng.next() * 3.0;
      }
    }

    if (a.isHopping) {
      a.pos.x += Math.cos(a.angle) * a.speed * dt;
      a.pos.y += Math.sin(a.angle) * a.speed * dt;
    }
  }

  private updateFirefly(a: BoidAgent, dt: number, time: number, wind: Vec2): void {
    a.pos.x += (Math.cos(time * 0.9 + a.homePos.x * 0.1) * 14 + wind.x * 4) * dt;
    a.pos.y += (Math.sin(time * 1.2 + a.homePos.y * 0.1) * 12 + wind.y * 3) * dt;
    a.altitude = 7 + Math.sin(time * 2.2 + a.homePos.x * 0.05) * 4;

    const dx = a.homePos.x - a.pos.x;
    const dy = a.homePos.y - a.pos.y;
    if (Math.hypot(dx, dy) > 120) {
      a.pos.x += dx * 0.3 * dt;
      a.pos.y += dy * 0.3 * dt;
    }
  }

  /**
   * Returns active ground wildlife (deer, rabbits, foxes, frogs) for Y-depth sorting in layer 5.
   */
  getGroundCreatures(): BoidAgent[] {
    const list: BoidAgent[] = [];
    for (let i = 0; i < this.maxCreatures; i++) {
      const a = this.pool[i];
      if (a.active && (a.type === 'deer' || a.type === 'rabbit' || a.type === 'fox' || a.type === 'frog')) {
        list.push(a);
      }
    }
    return list;
  }

  /**
   * Renders a specific ground creature with painterly detail.
   */
  drawGroundCreature(renderer: IRenderer, art: ArtToolkit, a: BoidAgent, alpha: number, time: number): void {
    const px = a.prevPos.x + (a.pos.x - a.prevPos.x) * alpha;
    const py = a.prevPos.y + (a.pos.y - a.prevPos.y) * alpha;

    switch (a.type) {
      case 'deer':
        art.drawDeer(px, py, a.angle, a.isFleeing, time);
        break;
      case 'rabbit':
        art.drawRabbit(px, py, a.angle, a.isHopping, time);
        break;
      case 'fox':
        art.drawFox(px, py, a.angle, a.isFleeing || a.speed > 40, time);
        break;
      case 'frog':
        art.drawFrog(px, py, a.angle, a.isHopping, time);
        break;
    }
  }

  /**
   * Renders bird shadows cast on the ground.
   */
  renderGroundShadows(renderer: IRenderer, art: ArtToolkit, alpha: number): void {
    for (let i = 0; i < this.maxCreatures; i++) {
      const a = this.pool[i];
      if (!a.active || a.type !== 'bird') continue;

      const px = lerp(a.prevPos.x, a.pos.x, alpha);
      const py = lerp(a.prevPos.y, a.pos.y, alpha);
      const alt = lerp(a.prevAltitude, a.altitude, alpha);

      const shadowLength = 0.4 + (1.0 - art.sunElevation) * 0.6;
      const sx = px + Math.sin(art.sunAngle) * alt * shadowLength;
      const sy = py + Math.cos(art.sunAngle) * alt * shadowLength * 0.5;

      art.drawBlobShadow(sx, sy, 4.5);
    }
  }

  /**
   * Renders butterflies fluttering near ground and flowers.
   */
  renderButterflies(renderer: IRenderer, art: ArtToolkit, alpha: number): void {
    for (let i = 0; i < this.maxCreatures; i++) {
      const a = this.pool[i];
      if (!a.active || a.type !== 'butterfly') continue;

      const px = lerp(a.prevPos.x, a.pos.x, alpha);
      const py = lerp(a.prevPos.y, a.pos.y, alpha);
      const alt = lerp(a.prevAltitude, a.altitude, alpha);

      art.drawButterfly(px, py - alt, a.angle, a.wingPhase, a.variant, a.isPerched);
    }
  }

  /**
   * Renders fireflies glowing in twilight and night.
   */
  renderFireflies(renderer: IRenderer, art: ArtToolkit, alpha: number, time: number, isNight: boolean): void {
    if (!isNight) return;
    for (let i = 0; i < this.maxCreatures; i++) {
      const a = this.pool[i];
      if (!a.active || a.type !== 'firefly') continue;

      const px = lerp(a.prevPos.x, a.pos.x, alpha);
      const py = lerp(a.prevPos.y, a.pos.y, alpha);
      const alt = lerp(a.prevAltitude, a.altitude, alpha);

      art.drawFirefly(px, py - alt, time);
    }
  }

  /**
   * Renders birds soaring overhead in the sky layer.
   */
  renderSkyCreatures(renderer: IRenderer, art: ArtToolkit, alpha: number): void {
    for (let i = 0; i < this.maxCreatures; i++) {
      const a = this.pool[i];
      if (!a.active || a.type !== 'bird') continue;

      const px = lerp(a.prevPos.x, a.pos.x, alpha);
      const py = lerp(a.prevPos.y, a.pos.y, alpha);
      const alt = lerp(a.prevAltitude, a.altitude, alpha);

      art.drawBird(px, py - alt, a.angle, a.wingPhase, a.isGliding, a.variant);
    }
  }
}
