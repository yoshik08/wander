import * as THREE from 'three';
import { ApexMythManager, ApexCreature, RoamingMyth } from '../entities/apex-myths';

export class ApexMythManager3D {
  private meshes: Map<string, THREE.Group> = new Map();
  public group = new THREE.Group();

  constructor(private apexMythManager: ApexMythManager) {}

  update(dt: number, time: number): void {
    // 1. Update Apex Creatures
    for (const apex of this.apexMythManager.apexCreatures) {
      this.updateApexMesh(apex, time);
    }
    
    // 2. Update Roaming Myth
    this.updateRoamingMesh(this.apexMythManager.roamingMyth, time);
  }

  private updateApexMesh(apex: ApexCreature, time: number) {
    let mesh = this.meshes.get(apex.id);
    if (!mesh) {
      mesh = new THREE.Group();
      
      const geo = new THREE.TorusKnotGeometry(20, 6, 64, 16);
      let color = 0xffffff;
      if (apex.element === 'Ignis') color = 0xe74c3c;
      else if (apex.element === 'Aqua') color = 0x3498db;
      else if (apex.element === 'Flora') color = 0x2ecc71;
      else if (apex.element === 'Terra') color = 0xe67e22;
      else if (apex.element === 'Aero') color = 0x9b59b6;
      
      const mat = new THREE.MeshStandardMaterial({ 
        color: color, 
        roughness: 0.2, 
        metalness: 0.8,
        emissive: color,
        emissiveIntensity: 0.2
      });
      
      const body = new THREE.Mesh(geo, mat);
      body.position.y = 40;
      body.castShadow = true;
      mesh.add(body);
      
      this.meshes.set(apex.id, mesh);
      this.group.add(mesh);
    }
    
    mesh.position.set(apex.x, 0, apex.y);
    mesh.rotation.y = time * 0.5;
    mesh.position.y = Math.sin(time) * 10;
  }
  
  private updateRoamingMesh(myth: RoamingMyth, time: number) {
    let mesh = this.meshes.get(myth.id);
    if (!mesh) {
      mesh = new THREE.Group();
      
      const geo = new THREE.DodecahedronGeometry(25, 0);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0xFAD02C, 
        roughness: 0.1, 
        metalness: 0.9,
        emissive: 0xFAD02C,
        emissiveIntensity: 0.5
      });
      
      const body = new THREE.Mesh(geo, mat);
      body.position.y = 50;
      body.castShadow = true;
      mesh.add(body);
      
      this.meshes.set(myth.id, mesh);
      this.group.add(mesh);
    }
    
    const pos = myth.getRealTimePosition();
    mesh.position.set(pos.x, 0, pos.y);
    mesh.rotation.x = time;
    mesh.rotation.y = time * 0.8;
  }
}
