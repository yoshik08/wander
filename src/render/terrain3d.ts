import * as THREE from 'three';
import { ChunkBufferData, CHUNK_PIXEL_SIZE, CHUNK_TILES } from '../world/chunk';
import { BIOMES } from '../world/biomes';

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
  
  void main() {
    // Very basic color based on elevation and biome
    vec3 baseColor = vec3(0.3, 0.6, 0.2); // Default Grass
    
    if (vElevation < 0.0) {
      baseColor = vec3(0.2, 0.4, 0.8); // Water/sand
    } else if (vElevation > 0.6) {
      baseColor = vec3(0.8, 0.8, 0.8); // Snow/rock
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

export class Terrain3D {
  scene: THREE.Scene;
  chunkMeshes: Map<string, THREE.Mesh> = new Map();
  material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        uSunLightColor: { value: new THREE.Color(1.0, 0.95, 0.9) },
        uSunLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() }
      }
    });
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
    // Revert Z so vertex shader can do it (or leave it in geometry, simpler for normals!)
    // If we leave it in geometry, we don't need to displace in VS.
    // Let's modify the VS to just use standard position!
    // But then we need to update the VS string above. Let's just do it in JS.

    const mesh = new THREE.Mesh(geometry, this.material);
    
    // Rotate to lie on XZ plane
    mesh.rotation.x = -Math.PI / 2;
    
    // Position the chunk
    mesh.position.x = data.chunkX * CHUNK_PIXEL_SIZE + (CHUNK_PIXEL_SIZE / 2);
    mesh.position.z = data.chunkY * CHUNK_PIXEL_SIZE + (CHUNK_PIXEL_SIZE / 2);
    
    mesh.receiveShadow = true;
    
    this.scene.add(mesh);
    this.chunkMeshes.set(key, mesh);
  }

  public unloadChunk(layer: number, chunkX: number, chunkY: number) {
    const key = `${layer}_${chunkX}_${chunkY}`;
    const mesh = this.chunkMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.chunkMeshes.delete(key);
    }
  }
}
