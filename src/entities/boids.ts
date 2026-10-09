import { Vec2, vec2, ColorRGBA, hexToRgba, lerpAngle, lerp } from '../core/math';
import { PRNG } from '../core/prng';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';

export type WildlifeType = 'bird' | 'butterfly';

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
}

export class WildlifeSystem {
  private readonly maxCreatures = 48;
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
        perchTimer: 0
      });
    }
  }

  /**
   * Initializes ambient birds and butterflies around the player's spawn region.
   */
  spawnCreaturesAround(originX: number, originY: number): void {
    let index = 0;

    // 1. Spawn 3 Flocks of Birds (4-6 birds per flock)
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

    // 2. Spawn Butterflies near flowers & clearings
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
      agent.variant = this.prng.rangeInt(0, 4); // 4 colorful butterfly species
      agent.isPerched = this.prng.next() < 0.3;
      agent.perchTimer = 2.0 + this.prng.next() * 3.0;
    }
  }

  /**
   * Updates boid steering behaviors, flight physics, and wing animation loops.
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
    const wrapMargin = 350;

    // 1. Advance Flock Center Circling
    for (let f = 0; f < this.flockCenters.length; f++) {
      const fc = this.flockCenters[f];
      // Slowly orbit flock territory
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

      if (a.type === 'bird') {
        this.updateBird(a, dt, time, wind);
      } else if (a.type === 'butterfly') {
        this.updateButterfly(a, dt, time, playerPos, wind);
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
    // A. Reynolds Flocking: Separation, Alignment, Cohesion
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

    // B. Steer toward flock territory center
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

    // Gentle pull back toward flock territory
    if (distToHome > 160) {
      this.scratchSteer.x += (toHomeX / distToHome) * 35;
      this.scratchSteer.y += (toHomeY / distToHome) * 35;
    }

    // Wind advection
    this.scratchSteer.x += wind.x * 12;
    this.scratchSteer.y += wind.y * 8;

    // Apply steering to velocity
    a.vel.x += this.scratchSteer.x * dt * 2.5;
    a.vel.y += this.scratchSteer.y * dt * 2.5;

    // Clamp speed
    const currentSpeed = Math.hypot(a.vel.x, a.vel.y);
    const targetSpeed = 75;
    if (currentSpeed > 0.01) {
      const factor = (targetSpeed / currentSpeed) * Math.min(1.0, 4.0 * dt);
      a.vel.x = lerp(a.vel.x, (a.vel.x / currentSpeed) * targetSpeed, factor);
      a.vel.y = lerp(a.vel.y, (a.vel.y / currentSpeed) * targetSpeed, factor);
    }

    // Integrate position
    a.pos.x += a.vel.x * dt;
    a.pos.y += a.vel.y * dt;
    a.angle = Math.atan2(a.vel.y, a.vel.x);

    // C. Altitude breathing
    a.altitude = 48 + Math.sin(time * 0.9 + a.flockId * 1.5) * 12;

    // D. Flap vs Glide Cycle
    a.glideTimer -= dt;
    if (a.glideTimer <= 0) {
      a.isGliding = !a.isGliding;
      a.glideTimer = a.isGliding ? (1.8 + this.prng.next() * 2.0) : (1.2 + this.prng.next() * 1.0);
    }

    if (!a.isGliding) {
      a.wingPhase += a.wingSpeed * dt;
    } else {
      // Wings held horizontally outstretched during glide
      a.wingPhase = lerp(a.wingPhase, 0.2, dt * 5.0);
    }
  }

  private updateButterfly(a: BoidAgent, dt: number, time: number, playerPos: Vec2, wind: Vec2): void {
    // 1. Perching logic
    if (a.isPerched) {
      a.perchTimer -= dt;
      // Gentle breathing wing motion while resting on a flower
      a.wingPhase += 3.5 * dt;

      // Startle if player walks too close
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

    // 2. Flying flutter logic
    a.wingPhase += a.wingSpeed * dt;

    // Random wandering steering
    a.wanderAngle += (this.prng.next() - 0.5) * 6.0 * dt;
    const steerX = Math.cos(a.wanderAngle) * 30 + wind.x * 6;
    const steerY = Math.sin(a.wanderAngle) * 30 + wind.y * 4;

    // Pull toward flower territory home
    const toHomeX = a.homePos.x - a.pos.x;
    const toHomeY = a.homePos.y - a.pos.y;
    const distHome = Math.hypot(toHomeX, toHomeY);
    if (distHome > 85) {
      a.vel.x += (toHomeX / distHome) * 25 * dt;
      a.vel.y += (toHomeY / distHome) * 25 * dt;
    }

    // Player avoidance
    const toPlayerX = a.pos.x - playerPos.x;
    const toPlayerY = a.pos.y - playerPos.y;
    const distPlayer = Math.hypot(toPlayerX, toPlayerY);
    if (distPlayer < 45 && distPlayer > 0.01) {
      a.vel.x += (toPlayerX / distPlayer) * 75 * dt;
      a.vel.y += (toPlayerY / distPlayer) * 75 * dt;
    }

    a.vel.x += steerX * dt * 2.0;
    a.vel.y += steerY * dt * 2.0;

    // Limit butterfly speed
    const spd = Math.hypot(a.vel.x, a.vel.y);
    const maxSpd = distPlayer < 45 ? 42 : 24;
    if (spd > maxSpd) {
      a.vel.x = (a.vel.x / spd) * maxSpd;
      a.vel.y = (a.vel.y / spd) * maxSpd;
    }

    // Vertical flutter bob
    a.altitude = 8 + Math.sin(time * 7.5 + a.pos.x * 0.1) * 3.5;

    a.pos.x += a.vel.x * dt;
    a.pos.y += a.vel.y * dt;
    a.angle = Math.atan2(a.vel.y, a.vel.x);

    // Random chance to perch on ground / flower
    if (this.prng.next() < 0.003 * dt * 60) {
      a.isPerched = true;
      a.perchTimer = 2.5 + this.prng.next() * 3.5;
      a.altitude = 2;
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

      // Shadow on ground projected by sun angle
      const shadowLength = 0.4 + (1.0 - art.sunElevation) * 0.6;
      const sx = px + Math.sin(art.sunAngle) * alt * shadowLength;
      const sy = py + Math.cos(art.sunAngle) * alt * shadowLength * 0.5;

      // Soft bird shadow silhouette
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
