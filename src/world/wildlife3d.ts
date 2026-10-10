import * as THREE from 'three';
import { WildCreatureManager } from '../entities/wild-creature';
import { CreatureMeshBuilder } from '../entities/creature3d';

export class WildlifeManager3D {
  private meshes: Map<string, THREE.Group> = new Map();
  public group = new THREE.Group();

  constructor(private wildManager: WildCreatureManager) {}

  update(dt: number, time: number, weather: { wetness: number; isSnowing: boolean; phase: string }): void {
    // Get active creatures (based on spawn condition)
    const activeCreatures = this.wildManager.getActiveCreatures(weather);
    const activeIds = new Set(activeCreatures.map(c => c.id));

    // Remove meshes for creatures that are no longer active
    for (const [id, mesh] of this.meshes.entries()) {
      if (!activeIds.has(id)) {
        this.group.remove(mesh);
        this.meshes.delete(id);
      }
    }

    // Add or update meshes for active creatures
    for (const creature of activeCreatures) {
      let mesh = this.meshes.get(creature.id);
      if (!mesh) {
        mesh = CreatureMeshBuilder.build(creature.genome);
        this.meshes.set(creature.id, mesh);
        this.group.add(mesh);
      }

      // Update position and rotation
      mesh.position.set(creature.pos.x, 0, creature.pos.y);

      // Procedural animation based on state
      const speed = creature.state === 'walk' ? 1.0 : (creature.state === 'idle' ? 0.2 : 0);
      const bob = Math.sin(time * 5.0 * speed) * 2.0;
      mesh.position.y = Math.max(0, bob);

      // Facing
      if (creature.state === 'walk') {
        const targetRot = Math.atan2(creature.vel.y, creature.vel.x);
        mesh.rotation.y = -targetRot + Math.PI / 2;
      } else if (creature.facingLeft !== undefined) {
        mesh.rotation.y = creature.facingLeft ? -Math.PI / 2 : Math.PI / 2;
      }
    }
  }

  updatePartyLeader(partyLeader: import('../entities/party-leader').PartyLeader | null, time: number): void {
    if (!partyLeader) {
      if (this.meshes.has('party_leader')) {
        const mesh = this.meshes.get('party_leader')!;
        this.group.remove(mesh);
        this.meshes.delete('party_leader');
      }
      return;
    }

    let mesh = this.meshes.get('party_leader');
    if (!mesh) {
      mesh = CreatureMeshBuilder.build(partyLeader.genome);
      this.meshes.set('party_leader', mesh);
      this.group.add(mesh);
    }

    mesh.position.set(partyLeader.pos.x, 0, partyLeader.pos.y);

    const speed = partyLeader.state === 'walk' ? 1.0 : (partyLeader.state === 'idle' ? 0.2 : 0);
    const bob = Math.sin(time * 5.0 * speed) * 2.0;
    mesh.position.y = Math.max(0, bob);

    if (partyLeader.state === 'walk') {
      const targetRot = Math.atan2(partyLeader.vel.y, partyLeader.vel.x);
      mesh.rotation.y = -targetRot + Math.PI / 2;
    } else {
      mesh.rotation.y = partyLeader.facingLeft ? -Math.PI / 2 : Math.PI / 2;
    }
  }
}
