import * as THREE from 'three';
import { ApexMythManager, ApexCreature, RoamingMyth } from '../entities/apex-myths';

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
      
      const geo = makeWonkyGeometry(new THREE.TorusKnotGeometry(20, 6, 64, 16), 1.5);
      let color = 0xffffff;
      if (apex.element === 'Ignis') color = 0xe74c3c;
      else if (apex.element === 'Aqua') color = 0x3498db;
      else if (apex.element === 'Flora') color = 0x2ecc71;
      else if (apex.element === 'Terra') color = 0xe67e22;
      else if (apex.element === 'Aero') color = 0x9b59b6;
      
      const mat = new THREE.MeshStandardMaterial({ 
        color: color, 
        roughness: 1.0, 
        metalness: 0.1,
        emissive: color,
        emissiveIntensity: 0.3,
        flatShading: true
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
      
      const geo = makeWonkyGeometry(new THREE.DodecahedronGeometry(25, 1), 2.0);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0xFAD02C, 
        roughness: 1.0, 
        metalness: 0.2,
        emissive: 0xFAD02C,
        emissiveIntensity: 0.4,
        flatShading: true
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
