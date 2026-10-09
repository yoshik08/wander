import { Vec2, vec2 } from '../core/math';

export interface VerletNode {
  pos: Vec2;
  oldPos: Vec2;
  pinned: boolean;
}

export class VerletRope {
  nodes: VerletNode[] = [];
  segmentLength: number;
  damping: number;

  constructor(nodeCount: number = 6, segmentLength: number = 3, startPos: Vec2 = vec2(0, 0), damping: number = 0.92) {
    this.segmentLength = segmentLength;
    this.damping = damping;

    for (let i = 0; i < nodeCount; i++) {
      this.nodes.push({
        pos: vec2(startPos.x, startPos.y + i * segmentLength),
        oldPos: vec2(startPos.x, startPos.y + i * segmentLength),
        pinned: i === 0
      });
    }
  }

  update(anchor: Vec2, externalForce: Vec2, dt: number): void {
    // 1. Update anchor
    if (this.nodes.length > 0) {
      this.nodes[0].pos.x = anchor.x;
      this.nodes[0].pos.y = anchor.y;
    }

    // 2. Verlet integration
    for (let i = 1; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const vx = (node.pos.x - node.oldPos.x) * this.damping;
      const vy = (node.pos.y - node.oldPos.y) * this.damping;

      node.oldPos.x = node.pos.x;
      node.oldPos.y = node.pos.y;

      // Apply velocity and external forces (wind + motion inertia)
      node.pos.x += vx + externalForce.x * dt * dt * 50;
      node.pos.y += vy + externalForce.y * dt * dt * 50;
    }

    // 3. Distance constraint relaxation (several passes for firmness)
    const iterations = 5;
    for (let pass = 0; pass < iterations; pass++) {
      for (let i = 0; i < this.nodes.length - 1; i++) {
        const n1 = this.nodes[i];
        const n2 = this.nodes[i + 1];

        const dx = n2.pos.x - n1.pos.x;
        const dy = n2.pos.y - n1.pos.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const diff = (dist - this.segmentLength) / dist;

        if (!n1.pinned) {
          n1.pos.x += dx * 0.5 * diff;
          n1.pos.y += dy * 0.5 * diff;
        }
        if (!n2.pinned) {
          n2.pos.x -= dx * 0.5 * diff;
          n2.pos.y -= dy * 0.5 * diff;
        }
      }
    }
  }
}
