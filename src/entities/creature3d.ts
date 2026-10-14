import * as THREE from 'three';
import { CreatureGenome } from './creature';

export class CreatureMeshBuilder {
  static build(genome: CreatureGenome): THREE.Group {
    const group = new THREE.Group();
    group.name = `Creature_${genome.name}`;
    
    // Scale based on genome.scale (2D scale vs 3D scale mapping)
    group.scale.setScalar(genome.scale * 0.15); // Adjust for 3D units

    const baseMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(genome.baseColor.r, genome.baseColor.g, genome.baseColor.b)
    });
    const accentMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(genome.accentColor.r, genome.accentColor.g, genome.accentColor.b)
    });

    const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    const bodyGeo = new THREE.BoxGeometry(10, 8, 14);
    const headGeo = new THREE.BoxGeometry(6, 6, 6);
    const legGeo = new THREE.CylinderGeometry(1.5, 1, 6);
    
    switch (genome.archetype) {
      case 'quadruped': {
        addMesh(bodyGeo, baseMat, [0, 6, 0]);
        addMesh(headGeo, accentMat, [0, 10, 8]);
        addMesh(legGeo, baseMat, [-3, 3, 5]);
        addMesh(legGeo, baseMat, [3, 3, 5]);
        addMesh(legGeo, baseMat, [-3, 3, -5]);
        addMesh(legGeo, baseMat, [3, 3, -5]);
        break;
      }
      case 'biped': {
        const bodyBiped = new THREE.CapsuleGeometry(4, 8);
        addMesh(bodyBiped, baseMat, [0, 10, 0]);
        addMesh(headGeo, accentMat, [0, 16, 2]);
        addMesh(legGeo, baseMat, [-2.5, 3, 0]);
        addMesh(legGeo, baseMat, [2.5, 3, 0]);
        break;
      }
      case 'serpent': {
        for (let i = 0; i < 5; i++) {
          const size = 5 - i * 0.5;
          const geo = new THREE.SphereGeometry(size);
          addMesh(geo, i % 2 === 0 ? baseMat : accentMat, [0, size, i * -4]);
        }
        addMesh(headGeo, accentMat, [0, 6, 4]);
        break;
      }
      case 'avian': {
        const bodyAvian = new THREE.SphereGeometry(5);
        addMesh(bodyAvian, baseMat, [0, 8, 0]);
        addMesh(headGeo, accentMat, [0, 12, 4]);
        const wing = new THREE.BoxGeometry(10, 1, 6);
        addMesh(wing, accentMat, [-7, 8, 0], [0, 0, 0.2]);
        addMesh(wing, accentMat, [7, 8, 0], [0, 0, -0.2]);
        break;
      }
      case 'blob': {
        const blobGeo = new THREE.DodecahedronGeometry(6);
        addMesh(blobGeo, baseMat, [0, 5, 0]);
        break;
      }
    }

    if (genome.appendage === 'horns') {
      const horn = new THREE.ConeGeometry(1, 4);
      addMesh(horn, accentMat, [-2, 14, 8], [-0.5, 0, 0.2]);
      addMesh(horn, accentMat, [2, 14, 8], [-0.5, 0, -0.2]);
    } else if (genome.appendage === 'tails') {
      const tail = new THREE.BoxGeometry(2, 2, 8);
      addMesh(tail, accentMat, [0, 6, -10], [0.2, 0, 0]);
    } else if (genome.appendage === 'wings' && genome.archetype !== 'avian') {
      const wing = new THREE.BoxGeometry(8, 1, 4);
      addMesh(wing, accentMat, [-6, 10, 0], [0, 0, 0.5]);
      addMesh(wing, accentMat, [6, 10, 0], [0, 0, -0.5]);
    }

    return group;
  }
}
