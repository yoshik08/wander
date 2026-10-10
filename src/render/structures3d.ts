import * as THREE from 'three';
import { ChunkBufferData, CHUNK_PIXEL_SIZE } from '../world/chunk';

export class ChunkStructures3D {
  public group = new THREE.Group();

  constructor(data: ChunkBufferData, getElevation: (x: number, y: number) => number) {
    if (!data.structures || data.structures.length === 0) return;

    for (const struct of data.structures) {
      // Local chunk coordinates
      const localX = struct.x - data.chunkX * CHUNK_PIXEL_SIZE;
      const localY = struct.y - data.chunkY * CHUNK_PIXEL_SIZE;
      
      const el = getElevation(struct.x, struct.y);
      const height = Math.max(0.0, el) * 100.0;
      
      this.createStructureMesh(struct.type, localX, height, localY);
    }
  }

  private createStructureMesh(type: string, x: number, y: number, z: number) {
    let mesh: THREE.Group | THREE.Mesh;
    
    // Very basic primitive representations for structures 1-50
    // A proper implementation would use instanced meshes and loaded models
    if (type.includes('house') || type.includes('cottage') || type.includes('tavern') || type.includes('forge') || type.includes('shack')) {
      mesh = new THREE.Group();
      // Base
      const baseGeo = new THREE.BoxGeometry(30, 20, 30);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 10;
      base.castShadow = true;
      base.receiveShadow = true;
      mesh.add(base);
      // Roof
      const roofGeo = new THREE.ConeGeometry(24, 15, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.8 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 27.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      mesh.add(roof);
    } else if (type.includes('well') || type.includes('stone') || type.includes('ruin') || type.includes('monolith') || type.includes('boulder')) {
      const geo = new THREE.CylinderGeometry(8, 8, 10, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x7F8C8D, roughness: 0.8 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 5;
      mesh.castShadow = true;
    } else if (type.includes('windmill') || type.includes('lighthouse') || type.includes('watchtower')) {
      mesh = new THREE.Group();
      const towerGeo = new THREE.CylinderGeometry(10, 15, 60, 8);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0xBDC3C7, roughness: 0.9 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = 30;
      tower.castShadow = true;
      mesh.add(tower);
    } else if (type.includes('fence') || type.includes('log') || type.includes('bench')) {
      const geo = new THREE.BoxGeometry(20, 5, 5);
      const mat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 2.5;
      mesh.castShadow = true;
    } else {
      // Default placeholder
      const geo = new THREE.BoxGeometry(10, 10, 10);
      const mat = new THREE.MeshStandardMaterial({ color: 0x95A5A6, roughness: 0.9 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 5;
      mesh.castShadow = true;
    }

    mesh.position.x = x;
    mesh.position.y += y;
    mesh.position.z = z;
    
    this.group.add(mesh);
  }

  public dispose() {
    this.group.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Group) {
        child.children.forEach(c => {
          if (c instanceof THREE.Mesh) {
            c.geometry.dispose();
            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
            else c.material.dispose();
          }
        });
      }
    });
  }
}
