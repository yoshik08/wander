import * as THREE from 'three';
import { NPCManager, Villager, Warden, RivalWanderer } from '../entities/npc';

export class NPCManager3D {
  private meshes: Map<string, THREE.Group> = new Map();
  public group = new THREE.Group();

  constructor(private npcManager: NPCManager) {}

  update(dt: number, time: number): void {
    // 1. Update Wardens
    for (const warden of this.npcManager.wardens) {
      this.updateEntityMesh(warden.id, warden.x, warden.y, time, warden.colorway.coat, warden.colorway.scarf);
    }
    
    // 2. Update Rival
    this.updateEntityMesh(this.npcManager.rival.id, this.npcManager.rival.x, this.npcManager.rival.y, time, this.npcManager.rival.colorway.coat, this.npcManager.rival.colorway.scarf);
    
    // 3. Update Villagers
    for (const villager of this.npcManager.villagers) {
      this.updateEntityMesh(villager.id, villager.x, villager.y, time, villager.colorway.coat, villager.colorway.hair);
    }
    
    // (Optional) Remove meshes for despawned villagers, though they never really despawn right now
  }

  private updateEntityMesh(id: string, x: number, y: number, time: number, coatColor: string, accentColor: string) {
    let mesh = this.meshes.get(id);
    if (!mesh) {
      mesh = new THREE.Group();
      
      const bodyGeo = new THREE.CapsuleGeometry(8, 16, 4, 8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 16;
      body.castShadow = true;
      mesh.add(body);
      
      const scarfGeo = new THREE.BoxGeometry(10, 4, 4);
      const scarfMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.9 });
      const scarf = new THREE.Mesh(scarfGeo, scarfMat);
      scarf.position.set(0, 24, -4);
      scarf.castShadow = true;
      mesh.add(scarf);
      
      this.meshes.set(id, mesh);
      this.group.add(mesh);
    }
    
    mesh.position.set(x, 0, y);
    
    // Very simple bobbing for life
    mesh.position.y = Math.sin(time * 2.0 + (x + y) * 0.1) * 1.5;
  }
}
