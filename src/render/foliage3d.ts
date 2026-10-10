import * as THREE from 'three';
import { ChunkBufferData, CHUNK_PIXEL_SIZE, CHUNK_TILES } from '../world/chunk';

// Very simple wind shader material for foliage
const foliageVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  
  uniform float time;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec3 transformed = vec3(position);
    
    // Wind effect (only apply to top of geometry, e.g. y > 0)
    // Assume origin is at bottom center
    if (position.y > 0.1) {
      float wind = sin(time * 2.0 + (modelMatrix[3][0] + modelMatrix[3][2]) * 0.05) * 0.1;
      transformed.x += wind * position.y;
    }
    
    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const foliageFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform vec3 color;
  
  void main() {
    // Simple shading
    float diffuse = max(0.2, dot(vNormal, vec3(0.5, 1.0, 0.5)));
    vec3 finalColor = color * diffuse;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function createFoliageMaterial(colorHex: number) {
  return new THREE.ShaderMaterial({
    vertexShader: foliageVertexShader,
    fragmentShader: foliageFragmentShader,
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(colorHex) }
    }
  });
}

// Shared Geometries & Materials
const treeGeo = new THREE.ConeGeometry(4, 20, 5);
treeGeo.translate(0, 10, 0); // Origin at bottom
const treeMat = createFoliageMaterial(0x27ae60);

const rockGeo = new THREE.DodecahedronGeometry(4);
rockGeo.translate(0, 2, 0);
const rockMat = createFoliageMaterial(0x7f8c8d);

const shrubGeo = new THREE.SphereGeometry(3, 5, 5);
shrubGeo.translate(0, 3, 0);
const shrubMat = createFoliageMaterial(0x2ecc71);

const flowerGeo = new THREE.PlaneGeometry(2, 2);
flowerGeo.translate(0, 1, 0);
const flowerMat = createFoliageMaterial(0xe74c3c); // red flower

export class ChunkFoliage {
  group: THREE.Group;
  materials: THREE.ShaderMaterial[] = [];
  
  constructor(data: ChunkBufferData, getElevation: (localX: number, localY: number) => number) {
    this.group = new THREE.Group();
    
    // Count props
    let trees = 0;
    let rocks = 0;
    let shrubs = 0;
    let flowers = 0;
    
    for (const p of data.props) {
      if (p.type === 'tree' || p.type === 'pine' || p.type === 'birch') trees++;
      else if (p.type === 'rock') rocks++;
      else if (p.type === 'shrub' || p.type === 'fern') shrubs++;
      else if (p.type === 'flower' || p.type === 'lilypad') flowers++;
    }
    
    // Create Instanced Meshes
    if (trees > 0) this.buildInstanced(data, trees, ['tree', 'pine', 'birch'], treeGeo, treeMat, getElevation);
    if (rocks > 0) this.buildInstanced(data, rocks, ['rock'], rockGeo, rockMat, getElevation);
    if (shrubs > 0) this.buildInstanced(data, shrubs, ['shrub', 'fern'], shrubGeo, shrubMat, getElevation);
    if (flowers > 0) this.buildInstanced(data, flowers, ['flower', 'lilypad'], flowerGeo, flowerMat, getElevation);
    
    // We also want some grass!
    this.buildGrass(data, getElevation);
    
    // Keep track of materials to update time uniform
    this.materials.push(treeMat, rockMat, shrubMat, flowerMat);
  }
  
  private buildInstanced(
    data: ChunkBufferData, 
    count: number, 
    types: string[], 
    geo: THREE.BufferGeometry, 
    mat: THREE.ShaderMaterial,
    getElevation: (x: number, y: number) => number
  ) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    const dummy = new THREE.Object3D();
    let idx = 0;
    
    for (const p of data.props) {
      if (types.includes(p.type)) {
        const h = getElevation(p.x, p.y);
        dummy.position.set(p.x, h, p.y);
        // Random rotation and slight scale var
        dummy.rotation.y = (p.variant * 1.618) * Math.PI * 2;
        const scale = 0.8 + (p.variant % 3) * 0.2;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
  }
  
  private buildGrass(data: ChunkBufferData, getElevation: (x: number, y: number) => number) {
    // Generate grass on land tiles
    let grassCount = 0;
    for (let i = 0; i < data.tileFlags.length; i++) {
      if (data.tileFlags[i] === 0 && data.elevation[i] > 0.0) { // TILE_FLAG_LAND
        grassCount += 3; // 3 blades per tile
      }
    }
    
    if (grassCount === 0) return;
    
    const grassGeo = new THREE.PlaneGeometry(1, 4);
    grassGeo.translate(0, 2, 0);
    const grassMat = createFoliageMaterial(0x55aa55);
    grassMat.side = THREE.DoubleSide;
    
    const mesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
    mesh.receiveShadow = true;
    
    const dummy = new THREE.Object3D();
    let idx = 0;
    
    for (let y = 0; y < CHUNK_TILES; y++) {
      for (let x = 0; x < CHUNK_TILES; x++) {
        const i = y * CHUNK_TILES + x;
        if (data.tileFlags[i] === 0 && data.elevation[i] > 0.0) {
          for (let g = 0; g < 3; g++) {
            const localX = (x + Math.random()) * (CHUNK_PIXEL_SIZE / CHUNK_TILES);
            const localY = (y + Math.random()) * (CHUNK_PIXEL_SIZE / CHUNK_TILES);
            const h = getElevation(localX, localY);
            dummy.position.set(localX, h, localY);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.setScalar(0.5 + Math.random() * 0.5);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx++, dummy.matrix);
          }
        }
      }
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    this.materials.push(grassMat);
    this.group.add(mesh);
  }

  updateTime(time: number) {
    for (const mat of this.materials) {
      if (mat.uniforms.time) {
        mat.uniforms.time.value = time;
      }
    }
  }

  dispose() {
    for (const child of this.group.children) {
      if ((child as THREE.InstancedMesh).dispose) {
        (child as THREE.InstancedMesh).dispose();
      }
    }
  }
}
