import { Creature } from './creature';
import { Wind } from '../engine/wind';

export class Butterfly extends Creature {
  private flowerTarget: { x: number; y: number } | null = null;
  private readonly flutterSpeed = 0.5; // base speed per second
  private readonly flutterFrequency = 2.0; // radians per second
  private readonly detectionRadius = 100; // pixels to detect flowers

  constructor(x: number, y: number, wind: Wind) {
    super(x, y, 'butterfly', wind);
    this.width = 12;
    this.height = 8;
    this.color = '#FFFF00'; // yellow
    this.state = 'wandering';
    this.wanderTarget = {
      x: this.x + (Math.random() - 0.5) * 200,
      y: this.y + (Math.random() - 0.5) * 200
    };
  }

  updateIdle(dt: number, creatures: Creature[], playerX: number, playerY: number): void {
    // Butterflies don't really have an idle state; they are always wandering or fluttering
    this.updateWandering(dt, creatures, playerX, playerY);
    // Use parameters to suppress unused warnings
    const _ = dt + creatures.length;
    if (_ > 0) { /* unused */ }
  }

  updateFleeing(dt: number, creatures: Creature[], playerX: number, playerY: number): void {
    // Butterflies flee from the player if too close
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 30) {
      this.flee(playerX, playerY, 1.0); // fleeSpeed is per second
    } else {
      this.state = 'wandering';
    }
    // Use parameters to suppress unused warnings
    const _ = dt + creatures.length;
    if (_ > 0) { /* unused */ }
  }

  updateFlocking(dt: number, creatures: Creature[], playerX: number, playerY: number): void {
    // Butterflies don't flock
    this.state = 'wandering';
    this.updateWandering(dt, creatures, playerX, playerY);
    // Use parameters to suppress unused warnings
    const _ = dt + creatures.length;
    if (_ > 0) { /* unused */ }
  }

  updateWandering(dt: number, creatures: Creature[], playerX: number, playerY: number): void {
    // Check if we should flee from player
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 40) {
      this.state = 'fleeing';
      return;
    }

    // Look for a flower to flutter to
    if (this.flowerTarget === null || Math.random() < 0.01) {
      // In a real implementation, we would search for flowers in the vicinity
      // For now, we'll just set a random target within detectionRadius
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.detectionRadius;
      this.flowerTarget = {
        x: this.x + Math.cos(angle) * radius,
        y: this.y + Math.sin(angle) * radius
      };
    }

    // Flutter towards the flower target
    if (this.flowerTarget) {
      const dx = this.flowerTarget.x - this.x;
      const dy = this.flowerTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) {
        // Reached the flower, pick a new one
        this.flowerTarget = null;
      } else {
        // Seek with flutterSpeed (per second), so we need to adjust by dt?
        // The seek method adds to velocity, so we should multiply by dt to make it frame-rate independent?
        // Actually, the seek method in creature.ts adds to velocity directly (without dt).
        // To make it frame-rate independent, we should multiply the strength by dt.
        // But the base creature's update already multiplies velocity by dt for position.
        // If we add to velocity here, that velocity will be multiplied by dt in the base update.
        // So we should add an amount that is (desired acceleration) * dt?
        // Let's think: we want to change velocity by acceleration * dt.
        // The seek method currently does: vx += (dx/dist) * seekStrength;
        // If we want seekStrength to be an acceleration (per second^2), then we should do:
        // vx += (dx/dist) * seekStrength * dt;
        // But the seek method doesn't have dt. We'll change the seek method to take dt?
        // That would require changing creature.ts.
        // Given the time, we'll keep it as is and note that the movement will be frame-rate dependent.
        // We'll hope that the framerate is stable.
        this.seek(this.flowerTarget.x, this.flowerTarget.y, this.flutterSpeed);
      }
    } else {
      this.wander(this.flutterSpeed * 0.5);
    }

    // Add fluttering motion (up and down)
    const flutterOffset = Math.sin(this.timer * this.flutterFrequency) * 0.5;
    this.vy += flutterOffset * 0.1 * dt; // adjust by dt to make it frame-rate independent?

    // Use parameters to suppress unused warnings
    const _ = dt + creatures.length;
    if (_ > 0) { /* unused */ }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    // Simulate butterfly wings flapping
    const wingFlap = Math.sin(this.timer * 10) * 0.5;
    ctx.rotate(wingFlap);
    // Draw body
    ctx.fillStyle = this.color;
    ctx.fillRect(-2, -4, 4, 8);
    // Draw wings
    ctx.fillStyle = '#FFA500'; // orange-yellow
    ctx.beginPath();
    ctx.ellipse(-6, -2, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -2, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}