import { Creature } from './creature';
import { Wind } from '../engine/wind';

export class Bird extends Creature {
  private fleeRadius = 60;
  private fleeSpeed = 1.5;
  private wanderStrength = 0.2;

  constructor(x: number, y: number, wind: Wind) {
    super(x, y, 'bird', wind);
    this.width = 16;
    this.height = 12;
    this.color = '#8B4513'; // brown
    this.state = 'idle';
  }

  updateIdle(dt: number, creatures: Creature[], playerX: number, playerY: number): void {
    // Birds don't really idle; they wander or flee
    this.updateWandering(dt, creatures, playerX, playerY);
    // Use parameters to suppress unused warnings
    const _ = dt + creatures.length;
    if (_ > 0) { /* unused */ }
  }

  updateFleeing(dt: number, creatures: Creature[], playerX: number, playerY: number): void {
    // Flee from player if too close
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.fleeRadius) {
      this.flee(playerX, playerY, this.fleeSpeed);
    } else {
      this.state = 'idle';
    }
    // Use parameters to suppress unused warnings
    const _ = dt + creatures.length;
    if (_ > 0) { /* unused */ }
  }

  updateFlocking(dt: number, creatures: Creature[], playerX: number, playerY: number): void {
    // Not used in this simple implementation
    this.updateWandering(dt, creatures, playerX, playerY);
    // Use parameters to suppress unused warnings
    const _ = dt + creatures.length;
    if (_ > 0) { /* unused */ }
  }

  updateWandering(dt: number, creatures: Creature[], playerX: number, playerY: number): void {
    // Wander randomly, but flee if player gets too close
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.fleeRadius) {
      this.state = 'fleeing';
    } else {
      this.wander(this.wanderStrength);
    }
    // Use parameters to suppress unused warnings
    const _ = dt + creatures.length;
    if (_ > 0) { /* unused */ }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    // Simulate wing flapping
    const wingFlap = Math.sin(this.timer * 15) * 0.3;
    ctx.rotate(wingFlap);
    // Draw body
    ctx.fillStyle = this.color;
    ctx.fillRect(-3, -4, 6, 8);
    // Draw wings
    ctx.fillStyle = '#A0522D'; // sienna
    ctx.beginPath();
    ctx.ellipse(-8, 0, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, 0, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Draw head
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(5, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}