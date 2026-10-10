import * as THREE from 'three';
import { ChunkBufferData, CHUNK_PIXEL_SIZE, CHUNK_TILES } from '../world/chunk';
import { BIOMES, BiomeType } from '../world/biomes';
import { ChunkFoliage } from './foliage3d';
import { ChunkStructures3D } from './structures3d';

const terrainVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vElevation;
  varying float vMoisture;
  varying float vTemperature;
  varying float vBiome;
  
  attribute float elevation;
  attribute float moisture;
  attribute float temperature;
  attribute float biome;

  void main() {
    vUv = uv;
    vElevation = elevation;
    vMoisture = moisture;
    vTemperature = temperature;
    vBiome = biome;
    
    // height is already baked into geometry Z coordinate during generation
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    
    // Compute basic normal for now (can compute better in geometry setup)
    vNormal = normalize(normalMatrix * normal);
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const terrainFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vElevation;
  varying float vMoisture;
  varying float vTemperature;
  varying float vBiome;

  uniform vec3 uSunLightColor;
  uniform vec3 uSunLightDir;
  uniform sampler2D uBiomeTex;
  
  void main() {
    // Sample biome color from 1D texture
    float biomeIndex = (vBiome + 0.5) / 32.0; // Assume up to 32 biomes
    vec4 biomeColor = texture2D(uBiomeTex, vec2(biomeIndex, 0.5));
    
    vec3 baseColor = biomeColor.rgb;
    
    if (vElevation < 0.0) {
      // Underwater sand
      baseColor = mix(baseColor, vec3(0.8, 0.7, 0.5), 0.7);
    } else if (vElevation > 0.6) {
      baseColor = mix(baseColor, vec3(0.8, 0.8, 0.8), (vElevation - 0.6) * 2.0); // Snow/rock
    }
    
    // Painterly shading (Toon style)
    float diffuse = max(0.0, dot(vNormal, uSunLightDir));
    float stepDiffuse = smoothstep(0.4, 0.45, diffuse) * 0.5 + 0.5; // Soft 2-band
    
    vec3 finalColor = baseColor * stepDiffuse;
    
    // Add some noise based on world position to simulate painterly strokes
    float strokeNoise = fract(sin(dot(vWorldPos.xz ,vec2(12.9898,78.233))) * 43758.5453) * 0.05;
    
    gl_FragColor = vec4(finalColor + strokeNoise, 1.0);
  }
`;

function createBiomeTexture(): THREE.DataTexture {
  const data = new Uint8Array(32 * 4); // 32 biomes max
  for (let i = 0; i < 32; i++) {
    const biomeDef = BIOMES[i as BiomeType];
    if (biomeDef) {
      const col = biomeDef.palette.groundPrimary;
      data[i * 4] = col.r * 255;
      data[i * 4 + 1] = col.g * 255;
      data[i * 4 + 2] = col.b * 255;
      data[i * 4 + 3] = 255;
    } else {
      data[i * 4] = 100;
      data[i * 4 + 1] = 150;
      data[i * 4 + 2] = 50;
      data[i * 4 + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, 32, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export class Terrain3D {
  scene: THREE.Scene;
  chunkMeshes: Map<string, THREE.Mesh> = new Map();
  chunkFoliage: Map<string, ChunkFoliage> = new Map();
  chunkStructures: Map<string, ChunkStructures3D> = new Map();
  material: THREE.ShaderMaterial;
  biomeTex: THREE.DataTexture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.biomeTex = createBiomeTexture();
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        uSunLightColor: { value: new THREE.Color(1.0, 0.95, 0.9) },
        uSunLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() },
        uBiomeTex: { value: this.biomeTex }
      }
    });
  }

  public updateTime(time: number) {
    for (const foliage of this.chunkFoliage.values()) {
      foliage.updateTime(time);
    }
  }

  public updateChunk(data: ChunkBufferData) {
    const key = `${data.layer}_${data.chunkX}_${data.chunkY}`;
    
    if (this.chunkMeshes.has(key)) {
      // Update existing or skip
      return;
    }

    // Geometry matches the chunk tile resolution
    // PlaneGeometry divides the plane into widthSegments x heightSegments.
    // So for 32 tiles, we need 31 segments so vertices match centers.
    const geometry = new THREE.PlaneGeometry(
      CHUNK_PIXEL_SIZE, 
      CHUNK_PIXEL_SIZE, 
      CHUNK_TILES - 1, 
      CHUNK_TILES - 1
    );

    // Provide custom attributes from chunk data
    // PlaneGeometry generates (widthSegments+1) * (heightSegments+1) vertices.
    // That is exactly 32 * 32 = 1024 vertices.
    
    const elevAttr = new THREE.BufferAttribute(new Float32Array(data.elevation), 1);
    const moistAttr = new THREE.BufferAttribute(new Float32Array(data.moisture), 1);
    const tempAttr = new THREE.BufferAttribute(new Float32Array(data.temperature), 1);
    const biomeAttr = new THREE.BufferAttribute(new Float32Array(data.biome), 1);
    
    // We need to re-orient the arrays because PlaneGeometry vertex index order
    // might differ from our chunk layout (y * width + x vs PlaneGeometry).
    // PlaneGeometry goes row by row from top to bottom (Y descending), left to right.
    // Our chunk data goes Y ascending from top-left.
    const reorderedElev = new Float32Array(1024);
    const reorderedMoist = new Float32Array(1024);
    const reorderedTemp = new Float32Array(1024);
    const reorderedBiome = new Float32Array(1024);
    
    const getElevation = (localX: number, localY: number) => {
      const tx = localX / (CHUNK_PIXEL_SIZE / CHUNK_TILES);
      const ty = localY / (CHUNK_PIXEL_SIZE / CHUNK_TILES);
      const x1 = Math.floor(tx);
      const y1 = Math.floor(ty);
      const x2 = Math.min(CHUNK_TILES - 1, x1 + 1);
      const y2 = Math.min(CHUNK_TILES - 1, y1 + 1);
      const fx = tx - x1;
      const fy = ty - y1;
      const e11 = data.elevation[y1 * CHUNK_TILES + x1];
      const e21 = data.elevation[y1 * CHUNK_TILES + x2];
      const e12 = data.elevation[y2 * CHUNK_TILES + x1];
      const e22 = data.elevation[y2 * CHUNK_TILES + x2];
      const top = e11 * (1 - fx) + e21 * fx;
      const bottom = e12 * (1 - fx) + e22 * fx;
      return (top * (1 - fy) + bottom * fy) * 100.0;
    };

    for (let y = 0; y < CHUNK_TILES; y++) {
      for (let x = 0; x < CHUNK_TILES; x++) {
        // PlaneGeometry: top to bottom, left to right
        const planeIdx = y * CHUNK_TILES + x;
        // Our data: top to bottom, left to right (same!)
        const chunkIdx = y * CHUNK_TILES + x;
        
        reorderedElev[planeIdx] = data.elevation[chunkIdx];
        reorderedMoist[planeIdx] = data.moisture[chunkIdx];
        reorderedTemp[planeIdx] = data.temperature[chunkIdx];
        reorderedBiome[planeIdx] = data.biome[chunkIdx];
      }
    }
    
    geometry.setAttribute('elevation', new THREE.BufferAttribute(reorderedElev, 1));
    geometry.setAttribute('moisture', new THREE.BufferAttribute(reorderedMoist, 1));
    geometry.setAttribute('temperature', new THREE.BufferAttribute(reorderedTemp, 1));
    geometry.setAttribute('biome', new THREE.BufferAttribute(reorderedBiome, 1));
    
    // Compute vertex normals properly based on new positions
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = Math.max(0.0, reorderedElev[i]) * 100.0;
      pos.setZ(i, z);
    }
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    
    const group = new THREE.Group();
    group.position.x = data.chunkX * CHUNK_PIXEL_SIZE + (CHUNK_PIXEL_SIZE / 2);
    group.position.z = data.chunkY * CHUNK_PIXEL_SIZE + (CHUNK_PIXEL_SIZE / 2);
    group.add(mesh);
    
    // Check if chunk has any water
    let hasWater = false;
    for (const e of data.elevation) {
      if (e < 0.0) { hasWater = true; break; }
    }
    
    if (hasWater) {
      const waterGeo = new THREE.PlaneGeometry(CHUNK_PIXEL_SIZE, CHUNK_PIXEL_SIZE);
      const waterMat = new THREE.MeshStandardMaterial({ 
        color: 0x3498db, 
        transparent: true, 
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.1
      });
      const waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.y = -2; // Slightly below 0
      waterMesh.receiveShadow = true;
      group.add(waterMesh);
    }
    
    this.scene.add(group);
    this.chunkMeshes.set(key, group as any);

    const foliage = new ChunkFoliage(data, getElevation);
    foliage.group.position.x = data.chunkX * CHUNK_PIXEL_SIZE;
    foliage.group.position.z = data.chunkY * CHUNK_PIXEL_SIZE;
    this.scene.add(foliage.group);
    this.chunkFoliage.set(key, foliage);
    
    const structures = new ChunkStructures3D(data, getElevation);
    structures.group.position.x = data.chunkX * CHUNK_PIXEL_SIZE;
    structures.group.position.z = data.chunkY * CHUNK_PIXEL_SIZE;
    this.scene.add(structures.group);
    this.chunkStructures.set(key, structures);
  }

  public unloadChunk(layer: number, chunkX: number, chunkY: number) {
    const key = `${layer}_${chunkX}_${chunkY}`;
    const mesh = this.chunkMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.chunkMeshes.delete(key);
    }

    const foliage = this.chunkFoliage.get(key);
    if (foliage) {
      this.scene.remove(foliage.group);
      foliage.dispose();
      this.chunkFoliage.delete(key);
    }
    
    const structures = this.chunkStructures.get(key);
    if (structures) {
      this.scene.remove(structures.group);
      structures.dispose();
      this.chunkStructures.delete(key);
    }
  }
}
