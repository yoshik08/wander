import * as THREE from 'three';
import { NPCManager, Villager, Warden, RivalWanderer } from '../entities/npc';

function makeWonkyGeometry(geo: THREE.BufferGeometry, intensity: number = 1.0) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    pos.setXYZ(i, px + (Math.random() - 0.5) * intensity, py + (Math.random() - 0.5) * intensity, pz + (Math.random() - 0.5) * intensity);
  }
  geo.computeVertexNormals();
  return geo;
}

export class NPCManager3D {
  private meshes: Map<string, THREE.Group> = new Map();
  public group = new THREE.Group();

  constructor(private npcManager: NPCManager) {}

  update(dt: number, time: number): void {
    for (const warden of this.npcManager.wardens) {
      this.updateEntityMesh(warden.id, warden.x, warden.y, time, warden.colorway.coat, warden.colorway.scarf);
    }
    this.updateEntityMesh(this.npcManager.rival.id, this.npcManager.rival.x, this.npcManager.rival.y, time, this.npcManager.rival.colorway.coat, this.npcManager.rival.colorway.scarf);
    for (const villager of this.npcManager.villagers) {
      this.updateEntityMesh(villager.id, villager.x, villager.y, time, villager.colorway.coat, villager.colorway.hair);
    }
  }

  private updateEntityMesh(id: string, x: number, y: number, time: number, coatColor: string, accentColor: string) {
    let mesh = this.meshes.get(id);
    if (!mesh) {
      mesh = new THREE.Group();
      
      const bodyGeo = makeWonkyGeometry(new THREE.CapsuleGeometry(8, 16, 4, 8), 0.8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 1.0, flatShading: true });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 16;
      body.castShadow = true;
      mesh.add(body);
      
      const scarfGeo = makeWonkyGeometry(new THREE.BoxGeometry(10, 4, 6, 2, 1, 1), 0.5);
      const scarfMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 1.0, flatShading: true });
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
