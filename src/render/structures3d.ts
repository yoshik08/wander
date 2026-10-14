import * as THREE from 'three';
import { ChunkBufferData, CHUNK_PIXEL_SIZE } from '../world/chunk';

// Utility for Ghibli/Painterly style
function makeWonkyGeometry(geo: THREE.BufferGeometry, intensity: number = 1.0) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    pos.setXYZ(
      i,
      px + (Math.random() - 0.5) * intensity,
      py + (Math.random() - 0.5) * intensity,
      pz + (Math.random() - 0.5) * intensity
    );
  }
  geo.computeVertexNormals();
  return geo;
}

function getPainterlyMaterial(hexColor: number) {
  const mat = new THREE.MeshStandardMaterial({ 
    color: hexColor, 
    roughness: 1.0,
    metalness: 0.0,
    flatShading: true // Gives a brush-stroke chunky look
  });
  return mat;
}

export class ChunkStructures3D {
  public group = new THREE.Group();

  constructor(data: ChunkBufferData, getElevation: (x: number, y: number) => number) {
    if (!data.structures || data.structures.length === 0) return;

    for (const struct of data.structures) {
      const localX = struct.x - data.chunkX * CHUNK_PIXEL_SIZE;
      const localY = struct.y - data.chunkY * CHUNK_PIXEL_SIZE;
      const height = Math.max(0.0, getElevation(localX, localY));
      this.createStructureMesh(struct.type, localX, height, localY);
    }
  }

  private createStructureMesh(type: string, x: number, y: number, z: number) {
    let mesh: THREE.Group | THREE.Mesh;
    
    // Ghibli-styled procedural structures
    if (type.includes('house') || type.includes('cottage') || type.includes('tavern') || type.includes('forge') || type.includes('shack')) {
      mesh = new THREE.Group();
      // Base: Wobbly uneven stucco
      const baseGeo = makeWonkyGeometry(new THREE.BoxGeometry(32, 22, 32, 3, 3, 3), 1.5);
      const baseMat = getPainterlyMaterial(0xF4E3C5); // Character cloak color / warm plaster
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 11;
      base.castShadow = true;
      base.receiveShadow = true;
      mesh.add(base);
      
      // Roof: Sagging tiled/thatch look
      const roofGeo = makeWonkyGeometry(new THREE.ConeGeometry(26, 18, 4, 3), 1.0);
      const roofMat = getPainterlyMaterial(0xE89D5E); // Autumn accent orange
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 31;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      mesh.add(roof);
      
    } else if (type.includes('well') || type.includes('stone') || type.includes('ruin') || type.includes('monolith') || type.includes('boulder') || type.includes('stalagmite') || type.includes('statue') || type.includes('shrine') || type.includes('obelisk') || type.includes('altar') || type.includes('ruins')) {
      // Wonky stacked stones
      const geo = makeWonkyGeometry(new THREE.CylinderGeometry(9, 11, 12, 6, 2), 1.5);
      const mat = getPainterlyMaterial(0x8A8E91); // Stone grey
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 6;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
    } else if (type.includes('windmill') || type.includes('lighthouse') || type.includes('watchtower') || type.includes('sea_stack') || type.includes('spire') || type.includes('observatory') || type.includes('beacon') || type.includes('crystal_spire')) {
      mesh = new THREE.Group();
      // Wobbly tall tower
      const towerGeo = makeWonkyGeometry(new THREE.CylinderGeometry(12, 18, 65, 7, 5), 2.0);
      const towerMat = getPainterlyMaterial(0xD0D3D4); // Light stone
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = 32.5;
      tower.castShadow = true;
      tower.receiveShadow = true;
      mesh.add(tower);
      
      if (type.includes('windmill')) {
        // Add windmill sails
        const sailGeo = makeWonkyGeometry(new THREE.BoxGeometry(40, 4, 2, 2, 1, 1), 0.5);
        const sailMat = getPainterlyMaterial(0xE89D5E);
        const sail1 = new THREE.Mesh(sailGeo, sailMat);
        sail1.position.set(0, 50, 13);
        const sail2 = new THREE.Mesh(sailGeo, sailMat);
        sail2.position.set(0, 50, 13);
        sail2.rotation.z = Math.PI / 2;
        mesh.add(sail1);
        mesh.add(sail2);
      }
      
    } else if (type.includes('fence') || type.includes('log') || type.includes('bench') || type.includes('driftwood') || type.includes('crane') || type.includes('cart') || type.includes('boat') || type.includes('dock') || type.includes('bridge')) {
      const geo = makeWonkyGeometry(new THREE.BoxGeometry(22, 6, 6, 2, 1, 1), 0.8);
      const mat = getPainterlyMaterial(0x5C4033); // Wood
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 2.5;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    } else if (type.includes('cave_entrance') || type.includes('sea_cave') || type.includes('pirate_cove')) {
      mesh = new THREE.Group();
      // Wonky mound for cave
      const caveGeo = makeWonkyGeometry(new THREE.SphereGeometry(28, 12, 12, 0, Math.PI), 2.5);
      const caveMat = getPainterlyMaterial(0x2C3E50); // Dark rocky opening
      caveMat.side = THREE.DoubleSide;
      const cave = new THREE.Mesh(caveGeo, caveMat);
      cave.rotation.x = Math.PI / 2;
      cave.castShadow = true;
      cave.receiveShadow = true;
      mesh.add(cave);
    } else if (type.includes('crystal') || type.includes('glowing')) {
      // Wonky tall crystal
      const geo = makeWonkyGeometry(new THREE.OctahedronGeometry(12, 1), 1.2);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0x9B59B6, 
        emissive: 0x8E44AD, 
        emissiveIntensity: 0.6,
        roughness: 0.2, 
        metalness: 0.1,
        flatShading: true
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 12;
      mesh.castShadow = true;
    } else if (type.includes('reef') || type.includes('kelp') || type.includes('pool') || type.includes('lake') || type.includes('trench')) {
      // Wobbly reef rings
      const geo = makeWonkyGeometry(new THREE.TorusGeometry(15, 3, 8, 16), 1.0);
      const mat = getPainterlyMaterial(0x1ABC9C); // Shallow green
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 2;
      mesh.rotation.x = Math.PI / 2;
      mesh.receiveShadow = true;
    } else {
      // Default placeholder blob
      const geo = makeWonkyGeometry(new THREE.SphereGeometry(12, 6, 6), 2.0);
      const mat = getPainterlyMaterial(0x8DB255); // Grass green blob
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 6;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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
