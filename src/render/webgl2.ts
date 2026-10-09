import { ColorRGBA, hexToRgba, Vec2, vec2 } from '../core/math';
import { IRenderer, RenderStats, WaterTileRenderData } from './types';
import {
  CHUNK_TILES,
  TILE_SIZE,
  CHUNK_PIXEL_SIZE,
  TILE_FLAG_WATER,
  TILE_FLAG_WATERFALL,
  TILE_FLAG_BRIDGE,
  TILE_FLAG_STEPPING_STONE,
  TILE_FLAG_PATH,
  Chunk
} from '../world/chunk';
import { BIOMES, BiomeType } from '../world/biomes';

const VERTEX_SHADER_SRC = `#version 300 es
layout(location = 0) in vec2 a_pos;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec4 a_color;

uniform mat3 u_matrix;

out vec2 v_uv;
out vec4 v_color;

void main() {
  vec3 pos = u_matrix * vec3(a_pos, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  v_uv = a_uv;
  v_color = a_color;
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;

in vec2 v_uv;
in vec4 v_color;

out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

// ==========================================
// Specialized WebGL2 Water Shader Pipeline
// ==========================================
const WATER_VERTEX_SHADER_SRC = `#version 300 es
layout(location = 0) in vec2 a_pos;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec2 a_flow;
layout(location = 3) in vec4 a_props; // x: depth, y: foamMask, z: isWaterfall, w: unused

uniform mat3 u_matrix;

out vec2 v_uv;
out vec2 v_flow;
out vec4 v_props;
out vec2 v_worldPos;

void main() {
  v_worldPos = a_pos;
  v_uv = a_uv;
  v_flow = a_flow;
  v_props = a_props;
  vec3 pos = u_matrix * vec3(a_pos, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
}
`;

const WATER_FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;

in vec2 v_uv;
in vec2 v_flow;
in vec4 v_props;
in vec2 v_worldPos;

uniform float u_time;

out vec4 fragColor;

void main() {
  float depth = v_props.x;
  int foamMask = int(v_props.y);
  float isWaterfall = v_props.z;

  // 1. Base Depth Color Gradient (Calm deep river teal to clear turquoise)
  vec4 deepCol = vec4(0.09, 0.32, 0.46, 0.94);    // #175276
  vec4 shallowCol = vec4(0.18, 0.58, 0.65, 0.88); // #2E94A6
  vec4 baseCol = mix(shallowCol, deepCol, clamp(depth, 0.0, 1.0));

  // 2. Flow Mapping (Advected dual wave layers along flow vector)
  vec2 fDir = normalize(v_flow);
  if (length(v_flow) < 0.05) fDir = vec2(0.8, 0.3);

  vec2 flowUV1 = v_worldPos * 0.04 + fDir * (u_time * 0.35);
  vec2 flowUV2 = v_worldPos * 0.04 + fDir * (u_time * 0.35 + 0.5) + vec2(0.37, 0.81);

  float wave1 = sin(flowUV1.x * 6.28 + flowUV1.y * 3.14 + u_time * 1.8);
  float wave2 = cos(flowUV2.x * 5.0 - flowUV2.y * 4.2 + u_time * 1.4);
  float flowNoise = (wave1 + wave2) * 0.5;

  // 3. Shimmer Highlights (Sun glints on surface)
  float shimmer = smoothstep(0.65, 0.98, flowNoise);
  vec4 shimmerCol = vec4(1.0, 1.0, 1.0, 0.65);

  // 4. Shoreline Foam (Undulating foam where water meets land edges - no discard, no dark lines)
  float foam = 0.0;
  // Bit 0: North
  if ((foamMask & 1) != 0 && v_uv.y < 0.25) {
    float edgeDist = v_uv.y / 0.25;
    float ripple = sin(v_worldPos.x * 0.4 + u_time * 2.5) * 0.15;
    if (edgeDist < (0.8 + ripple)) foam = max(foam, (1.0 - edgeDist) * 0.85);
  }
  // Bit 1: South
  if ((foamMask & 2) != 0 && v_uv.y > 0.75) {
    float edgeDist = (1.0 - v_uv.y) / 0.25;
    float ripple = cos(v_worldPos.x * 0.4 + u_time * 2.5) * 0.15;
    if (edgeDist < (0.8 + ripple)) foam = max(foam, (1.0 - edgeDist) * 0.85);
  }
  // Bit 2: East
  if ((foamMask & 4) != 0 && v_uv.x > 0.75) {
    float edgeDist = (1.0 - v_uv.x) / 0.25;
    float ripple = sin(v_worldPos.y * 0.4 + u_time * 2.5) * 0.15;
    if (edgeDist < (0.8 + ripple)) foam = max(foam, (1.0 - edgeDist) * 0.85);
  }
  // Bit 3: West
  if ((foamMask & 8) != 0 && v_uv.x < 0.25) {
    float edgeDist = v_uv.x / 0.25;
    float ripple = cos(v_worldPos.y * 0.4 + u_time * 2.5) * 0.15;
    if (edgeDist < (0.8 + ripple)) foam = max(foam, (1.0 - edgeDist) * 0.85);
  }

  vec4 foamCol = vec4(0.95, 0.98, 1.0, 0.80);

  // 5. Waterfall Froth & Spray
  if (isWaterfall > 0.5) {
    float fallSpeed = u_time * 14.0;
    float cascade = sin(v_worldPos.y * 0.6 - fallSpeed) * cos(v_worldPos.x * 0.8);
    if (cascade > -0.2) {
      foam = max(foam, 0.9);
    }
  }

  vec4 finalCol = mix(baseCol, shimmerCol, shimmer * 0.35);
  finalCol = mix(finalCol, foamCol, clamp(foam, 0.0, 1.0));

  fragColor = finalCol;
}
`;

export class WebGL2Renderer implements IRenderer {
  readonly backend = 'webgl2' as const;
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  width: number = 0;
  height: number = 0;
  dpr: number = 1;

  private cameraPos: Vec2 = vec2(0, 0);
  private cameraZoom: number = 1;

  // General batching constants
  private readonly MAX_QUADS = 8192;
  private readonly VERTICES_PER_QUAD = 4;
  private readonly INDICES_PER_QUAD = 6;
  private readonly FLOATS_PER_VERTEX = 8; // x, y, u, v, r, g, b, a

  private vertexData: Float32Array;
  private quadCount = 0;
  private drawCalls = 0;

  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private ibo: WebGLBuffer | null = null;
  private program: WebGLProgram | null = null;
  private uMatrixLoc: WebGLUniformLocation | null = null;

  // Water specialized pipeline
  private readonly MAX_WATER_TILES = 4096;
  private readonly FLOATS_PER_WATER_VERTEX = 10; // x, y, u, v, flowX, flowY, depth, foamMask, isWaterfall, pad
  private waterVertexData: Float32Array;
  private waterProgram: WebGLProgram | null = null;
  private uWaterMatrixLoc: WebGLUniformLocation | null = null;
  private uWaterTimeLoc: WebGLUniformLocation | null = null;
  private waterVao: WebGLVertexArrayObject | null = null;
  private waterVbo: WebGLBuffer | null = null;
  private waterIbo: WebGLBuffer | null = null;

  // White 1x1 fallback texture
  private whiteTexture: WebGLTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;

    this.vertexData = new Float32Array(this.MAX_QUADS * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX);
    this.waterVertexData = new Float32Array(this.MAX_WATER_TILES * this.VERTICES_PER_QUAD * this.FLOATS_PER_WATER_VERTEX);

    this.initGL();
    this.initWaterGL();
  }

  private initGL(): void {
    const gl = this.gl;

    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Shader Link Error: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;
    this.uMatrixLoc = gl.getUniformLocation(program, 'u_matrix');

    // Index buffer (static quad indices)
    const indices = new Uint16Array(this.MAX_QUADS * this.INDICES_PER_QUAD);
    for (let i = 0; i < this.MAX_QUADS; i++) {
      const vOffset = i * 4;
      const iOffset = i * 6;
      indices[iOffset + 0] = vOffset + 0;
      indices[iOffset + 1] = vOffset + 1;
      indices[iOffset + 2] = vOffset + 2;
      indices[iOffset + 3] = vOffset + 2;
      indices[iOffset + 4] = vOffset + 3;
      indices[iOffset + 5] = vOffset + 0;
    }

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const stride = this.FLOATS_PER_VERTEX * 4;
    // Location 0: a_pos (2 floats)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);

    // Location 1: a_uv (2 floats)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 2 * 4);

    // Location 2: a_color (4 floats)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 4 * 4);

    gl.bindVertexArray(null);

    // Blending setup (premultiplied/standard alpha blending)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Create 1x1 white texture
    this.whiteTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  }

  private initWaterGL(): void {
    const gl = this.gl;

    const vs = this.compileShader(gl.VERTEX_SHADER, WATER_VERTEX_SHADER_SRC);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, WATER_FRAGMENT_SHADER_SRC);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Water Shader Link Error: ${gl.getProgramInfoLog(program)}`);
    }
    this.waterProgram = program;
    this.uWaterMatrixLoc = gl.getUniformLocation(program, 'u_matrix');
    this.uWaterTimeLoc = gl.getUniformLocation(program, 'u_time');

    const indices = new Uint16Array(this.MAX_WATER_TILES * this.INDICES_PER_QUAD);
    for (let i = 0; i < this.MAX_WATER_TILES; i++) {
      const vOffset = i * 4;
      const iOffset = i * 6;
      indices[iOffset + 0] = vOffset + 0;
      indices[iOffset + 1] = vOffset + 1;
      indices[iOffset + 2] = vOffset + 2;
      indices[iOffset + 3] = vOffset + 2;
      indices[iOffset + 4] = vOffset + 3;
      indices[iOffset + 5] = vOffset + 0;
    }

    this.waterVao = gl.createVertexArray();
    gl.bindVertexArray(this.waterVao);

    this.waterVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.waterVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.waterVertexData.byteLength, gl.DYNAMIC_DRAW);

    this.waterIbo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.waterIbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const stride = this.FLOATS_PER_WATER_VERTEX * 4;
    // Location 0: a_pos (2 floats)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);

    // Location 1: a_uv (2 floats)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 2 * 4);

    // Location 2: a_flow (2 floats)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 4 * 4);

    // Location 3: a_props (4 floats: depth, foamMask, isWaterfall, pad)
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 6 * 4);

    gl.bindVertexArray(null);
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failure: ${err}`);
    }
    return shader;
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  setCamera(centerX: number, centerY: number, zoom: number = 1): void {
    this.cameraPos.x = centerX;
    this.cameraPos.y = centerY;
    this.cameraZoom = zoom;
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return {
      x: this.cameraPos.x + (screenX - halfW) / this.cameraZoom,
      y: this.cameraPos.y + (screenY - halfH) / this.cameraZoom
    };
  }

  worldToScreen(worldX: number, worldY: number): Vec2 {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return {
      x: halfW + (worldX - this.cameraPos.x) * this.cameraZoom,
      y: halfH + (worldY - this.cameraPos.y) * this.cameraZoom
    };
  }

  beginFrame(clearColor?: ColorRGBA): void {
    const gl = this.gl;
    this.drawCalls = 0;
    this.quadCount = 0;

    if (clearColor) {
      gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  private getMatrix(): Float32Array {
    const w = this.width;
    const h = this.height;
    const zoom = this.cameraZoom;
    const dpr = this.dpr;

    // Snap only final draw translation to physical device pixels to prevent any subpixel judder
    const snappedX = Math.round(this.cameraPos.x * zoom * dpr) / (zoom * dpr);
    const snappedY = Math.round(this.cameraPos.y * zoom * dpr) / (zoom * dpr);

    const sx = (2 * zoom) / w;
    const sy = (-2 * zoom) / h;
    const tx = -snappedX * sx;
    const ty = -snappedY * sy;

    return new Float32Array([
      sx, 0, 0,
      0, sy, 0,
      tx, ty, 1
    ]);
  }

  buildChunkMesh(chunk: Chunk): void {
    const gl = this.gl;
    const { chunkX, chunkY, data } = chunk;
    const baseWorldX = chunkX * CHUNK_PIXEL_SIZE;
    const baseWorldY = chunkY * CHUNK_PIXEL_SIZE;

    // 1. Terrain Quads (Land, Paths, Pebbles, Riverbed under water)
    const maxTerrainQuads = CHUNK_TILES * CHUNK_TILES + 300;
    const terrainData = new Float32Array(maxTerrainQuads * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX);
    let terrainQuadCount = 0;

    const pushTerrainQuad = (x0: number, y0: number, w: number, h: number, col: ColorRGBA) => {
      if (terrainQuadCount >= maxTerrainQuads) return;
      const offset = terrainQuadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX;
      const x1 = x0 + w;
      const y1 = y0 + h;
      const r = col.r, g = col.g, b = col.b, a = col.a;

      terrainData[offset + 0] = x0; terrainData[offset + 1] = y0;
      terrainData[offset + 2] = 0;  terrainData[offset + 3] = 0;
      terrainData[offset + 4] = r;  terrainData[offset + 5] = g; terrainData[offset + 6] = b; terrainData[offset + 7] = a;

      terrainData[offset + 8] = x1; terrainData[offset + 9] = y0;
      terrainData[offset + 10] = 1; terrainData[offset + 11] = 0;
      terrainData[offset + 12] = r; terrainData[offset + 13] = g; terrainData[offset + 14] = b; terrainData[offset + 15] = a;

      terrainData[offset + 16] = x1; terrainData[offset + 17] = y1;
      terrainData[offset + 18] = 1;  terrainData[offset + 19] = 1;
      terrainData[offset + 20] = r;  terrainData[offset + 21] = g; terrainData[offset + 22] = b; terrainData[offset + 23] = a;

      terrainData[offset + 24] = x0; terrainData[offset + 25] = y1;
      terrainData[offset + 26] = 0;  terrainData[offset + 27] = 1;
      terrainData[offset + 28] = r;  terrainData[offset + 29] = g; terrainData[offset + 30] = b; terrainData[offset + 31] = a;

      terrainQuadCount++;
    };

    // 2. Water Quads (pos, uv, flow, props)
    const maxWaterQuads = CHUNK_TILES * CHUNK_TILES;
    const waterData = new Float32Array(maxWaterQuads * this.VERTICES_PER_QUAD * this.FLOATS_PER_WATER_VERTEX);
    let waterQuadCount = 0;

    const pushWaterQuad = (x0: number, y0: number, w: number, h: number, fx: number, fy: number, depth: number, foam: number, isFall: boolean) => {
      if (waterQuadCount >= maxWaterQuads) return;
      const offset = waterQuadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_WATER_VERTEX;
      const x1 = x0 + w;
      const y1 = y0 + h;
      const fallVal = isFall ? 1.0 : 0.0;

      waterData[offset + 0] = x0; waterData[offset + 1] = y0;
      waterData[offset + 2] = 0;  waterData[offset + 3] = 0;
      waterData[offset + 4] = fx; waterData[offset + 5] = fy;
      waterData[offset + 6] = depth; waterData[offset + 7] = foam; waterData[offset + 8] = fallVal; waterData[offset + 9] = 0;

      waterData[offset + 10] = x1; waterData[offset + 11] = y0;
      waterData[offset + 12] = 1;  waterData[offset + 13] = 0;
      waterData[offset + 14] = fx; waterData[offset + 15] = fy;
      waterData[offset + 16] = depth; waterData[offset + 17] = foam; waterData[offset + 18] = fallVal; waterData[offset + 19] = 0;

      waterData[offset + 20] = x1; waterData[offset + 21] = y1;
      waterData[offset + 22] = 1;  waterData[offset + 23] = 1;
      waterData[offset + 24] = fx; waterData[offset + 25] = fy;
      waterData[offset + 26] = depth; waterData[offset + 27] = foam; waterData[offset + 28] = fallVal; waterData[offset + 29] = 0;

      waterData[offset + 30] = x0; waterData[offset + 31] = y1;
      waterData[offset + 32] = 0;  waterData[offset + 33] = 1;
      waterData[offset + 34] = fx; waterData[offset + 35] = fy;
      waterData[offset + 36] = depth; waterData[offset + 37] = foam; waterData[offset + 38] = fallVal; waterData[offset + 39] = 0;

      waterQuadCount++;
    };

    // 3. Over-Water Quads (bridges, stepping stones)
    const maxOverWaterQuads = 600;
    const overWaterData = new Float32Array(maxOverWaterQuads * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX);
    let overWaterQuadCount = 0;

    const pushOverWaterQuad = (x0: number, y0: number, w: number, h: number, col: ColorRGBA) => {
      if (overWaterQuadCount >= maxOverWaterQuads) return;
      const offset = overWaterQuadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX;
      const x1 = x0 + w;
      const y1 = y0 + h;
      const r = col.r, g = col.g, b = col.b, a = col.a;

      overWaterData[offset + 0] = x0; overWaterData[offset + 1] = y0;
      overWaterData[offset + 2] = 0;  overWaterData[offset + 3] = 0;
      overWaterData[offset + 4] = r;  overWaterData[offset + 5] = g; overWaterData[offset + 6] = b; overWaterData[offset + 7] = a;

      overWaterData[offset + 8] = x1; overWaterData[offset + 9] = y0;
      overWaterData[offset + 10] = 1; overWaterData[offset + 11] = 0;
      overWaterData[offset + 12] = r; overWaterData[offset + 13] = g; overWaterData[offset + 14] = b; overWaterData[offset + 15] = a;

      overWaterData[offset + 16] = x1; overWaterData[offset + 17] = y1;
      overWaterData[offset + 18] = 1;  overWaterData[offset + 19] = 1;
      overWaterData[offset + 20] = r;  overWaterData[offset + 21] = g; overWaterData[offset + 22] = b; overWaterData[offset + 23] = a;

      overWaterData[offset + 24] = x0; overWaterData[offset + 25] = y1;
      overWaterData[offset + 26] = 0;  overWaterData[offset + 27] = 1;
      overWaterData[offset + 28] = r;  overWaterData[offset + 29] = g; overWaterData[offset + 30] = b; overWaterData[offset + 31] = a;

      overWaterQuadCount++;
    };

    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const idx = ty * CHUNK_TILES + tx;
        const wx = baseWorldX + tx * TILE_SIZE;
        const wy = baseWorldY + ty * TILE_SIZE;

        const bType = data.biome[idx] as BiomeType;
        const biomeDef = BIOMES[bType] || BIOMES[BiomeType.Meadow];
        const elev = data.elevation[idx];
        const flag = data.tileFlags[idx];

        if (flag === TILE_FLAG_WATER || flag === TILE_FLAG_WATERFALL) {
          // Riverbed underneath so no dark/black gap
          pushTerrainQuad(wx, wy, TILE_SIZE, TILE_SIZE, hexToRgba('#2D5432'));
          // Water tile
          pushWaterQuad(wx, wy, TILE_SIZE, TILE_SIZE, data.flowDirX[idx], data.flowDirY[idx], elev < -0.45 ? 1.0 : 0.4, data.foamMask[idx], flag === TILE_FLAG_WATERFALL);
        } else if (flag === TILE_FLAG_BRIDGE) {
          pushTerrainQuad(wx, wy, TILE_SIZE, TILE_SIZE, hexToRgba('#2D5432'));
          pushWaterQuad(wx, wy, TILE_SIZE, TILE_SIZE, data.flowDirX[idx], data.flowDirY[idx], 0.7, 0, false);

          // Bridge planks & railings (bridges only where path crosses water!)
          const isHoriz = Math.abs(data.flowDirX[idx]) <= Math.abs(data.flowDirY[idx]);
          pushOverWaterQuad(wx, wy, TILE_SIZE, TILE_SIZE, hexToRgba('#3E2723'));
          if (isHoriz) {
            for (let pIdx = 0; pIdx < 3; pIdx++) {
              const px = wx + pIdx * 8;
              pushOverWaterQuad(px + 1, wy + 2, 6, TILE_SIZE - 4, hexToRgba('#6D4C41'));
              pushOverWaterQuad(px + 1, wy + 2, 2, TILE_SIZE - 4, hexToRgba('#8D6E63'));
            }
            pushOverWaterQuad(wx, wy, TILE_SIZE, 2.5, hexToRgba('#4A2E16'));
            pushOverWaterQuad(wx, wy + TILE_SIZE - 2.5, TILE_SIZE, 2.5, hexToRgba('#4A2E16'));
          } else {
            for (let pIdx = 0; pIdx < 3; pIdx++) {
              const py = wy + pIdx * 8;
              pushOverWaterQuad(wx + 2, py + 1, TILE_SIZE - 4, 6, hexToRgba('#6D4C41'));
              pushOverWaterQuad(wx + 2, py + 1, TILE_SIZE - 4, 2, hexToRgba('#8D6E63'));
            }
            pushOverWaterQuad(wx, wy, 2.5, TILE_SIZE, hexToRgba('#4A2E16'));
            pushOverWaterQuad(wx + TILE_SIZE - 2.5, wy, 2.5, TILE_SIZE, hexToRgba('#4A2E16'));
          }
        } else if (flag === TILE_FLAG_STEPPING_STONE) {
          pushTerrainQuad(wx, wy, TILE_SIZE, TILE_SIZE, hexToRgba('#2D5432'));
          pushWaterQuad(wx, wy, TILE_SIZE, TILE_SIZE, data.flowDirX[idx], data.flowDirY[idx], 0.3, data.foamMask[idx], false);
          pushOverWaterQuad(wx + 6, wy + 7, 12, 12, hexToRgba('#1B2631', 0.35));
          pushOverWaterQuad(wx + 6, wy + 5, 12, 12, hexToRgba('#7F8C8D'));
          pushOverWaterQuad(wx + 8, wy + 6, 6, 6, hexToRgba('#95A5A6'));
          pushOverWaterQuad(wx + 12, wy + 10, 4, 4, hexToRgba('#27AE60', 0.7));
        } else if (flag === TILE_FLAG_PATH) {
          const pathHash = Math.abs(Math.sin(wx * 11.3 + wy * 67.1));
          const pathColor = pathHash > 0.5 ? hexToRgba('#93704C') : hexToRgba('#A1805B');
          pushTerrainQuad(wx, wy, TILE_SIZE, TILE_SIZE, pathColor);
          if (pathHash > 0.75) {
            pushTerrainQuad(wx + 7, wy + 13, 3, 3, hexToRgba('#755635', 0.8));
            pushTerrainQuad(wx + 15, wy + 7, 2.5, 2.5, hexToRgba('#B3926B', 0.8));
          }
        } else {
          // Natural land tile
          const tileHash = Math.abs(Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453);
          const baseCol = tileHash > 0.55
            ? biomeDef.palette.groundPrimary
            : tileHash > 0.25
            ? biomeDef.palette.groundSecondary
            : biomeDef.palette.groundAccent;

          const macroShift = (Math.sin(wx * 0.004) * Math.cos(wy * 0.004)) * 0.06;
          const col: ColorRGBA = {
            r: Math.max(0, Math.min(1, baseCol.r + macroShift)),
            g: Math.max(0, Math.min(1, baseCol.g + macroShift)),
            b: Math.max(0, Math.min(1, baseCol.b + macroShift)),
            a: baseCol.a
          };
          pushTerrainQuad(wx, wy, TILE_SIZE, TILE_SIZE, col);
        }
      }
    }

    // Build Terrain VAO/VBO
    const terrainVao = gl.createVertexArray();
    gl.bindVertexArray(terrainVao);
    const terrainVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, terrainVbo);
    gl.bufferData(gl.ARRAY_BUFFER, terrainData.subarray(0, terrainQuadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

    const stride = this.FLOATS_PER_VERTEX * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 4 * 4);

    // Build Water VAO/VBO if water exists
    let waterVao: WebGLVertexArrayObject | null = null;
    let waterVbo: WebGLBuffer | null = null;
    if (waterQuadCount > 0) {
      waterVao = gl.createVertexArray();
      gl.bindVertexArray(waterVao);
      waterVbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, waterVbo);
      gl.bufferData(gl.ARRAY_BUFFER, waterData.subarray(0, waterQuadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_WATER_VERTEX), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.waterIbo);

      const waterStride = this.FLOATS_PER_WATER_VERTEX * 4;
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, waterStride, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, waterStride, 2 * 4);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, waterStride, 4 * 4);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, waterStride, 6 * 4);
    }

    // Build Over-Water VAO/VBO if overWater exists
    let overWaterVao: WebGLVertexArrayObject | null = null;
    let overWaterVbo: WebGLBuffer | null = null;
    if (overWaterQuadCount > 0) {
      overWaterVao = gl.createVertexArray();
      gl.bindVertexArray(overWaterVao);
      overWaterVbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, overWaterVbo);
      gl.bufferData(gl.ARRAY_BUFFER, overWaterData.subarray(0, overWaterQuadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 2 * 4);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 4 * 4);
    }

    gl.bindVertexArray(null);

    chunk.renderCache = {
      terrainVao,
      terrainVbo,
      terrainQuadCount,
      waterVao,
      waterVbo,
      waterQuadCount,
      overWaterVao,
      overWaterVbo,
      overWaterQuadCount
    };
  }

  drawChunkTerrain(chunk: any): void {
    if (!chunk.renderCache) {
      this.buildChunkMesh(chunk);
    }
    const mesh = chunk.renderCache;
    if (!mesh || mesh.terrainQuadCount === 0) return;

    this.flush(); // Flush any pending dynamic quads

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uMatrixLoc, false, this.getMatrix());

    gl.bindVertexArray(mesh.terrainVao);
    gl.drawElements(gl.TRIANGLES, mesh.terrainQuadCount * this.INDICES_PER_QUAD, gl.UNSIGNED_SHORT, 0);
    this.drawCalls++;
  }

  drawChunkWater(chunk: any, time: number): void {
    if (!chunk.renderCache) {
      this.buildChunkMesh(chunk);
    }
    const mesh = chunk.renderCache;
    if (!mesh || !mesh.waterVao || mesh.waterQuadCount === 0) return;

    this.flush(); // Flush any pending dynamic quads

    const gl = this.gl;
    gl.useProgram(this.waterProgram);
    gl.uniformMatrix3fv(this.uWaterMatrixLoc, false, this.getMatrix());
    gl.uniform1f(this.uWaterTimeLoc, time);

    gl.bindVertexArray(mesh.waterVao);
    gl.drawElements(gl.TRIANGLES, mesh.waterQuadCount * this.INDICES_PER_QUAD, gl.UNSIGNED_SHORT, 0);
    this.drawCalls++;
  }

  drawChunkOverWater(chunk: any): void {
    if (!chunk.renderCache) {
      this.buildChunkMesh(chunk);
    }
    const mesh = chunk.renderCache;
    if (!mesh || !mesh.overWaterVao || mesh.overWaterQuadCount === 0) return;

    this.flush(); // Flush any pending dynamic quads

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uMatrixLoc, false, this.getMatrix());

    gl.bindVertexArray(mesh.overWaterVao);
    gl.drawElements(gl.TRIANGLES, mesh.overWaterQuadCount * this.INDICES_PER_QUAD, gl.UNSIGNED_SHORT, 0);
    this.drawCalls++;
  }

  freeChunk(chunk: any): void {
    const mesh = chunk.renderCache;
    if (!mesh) return;
    const gl = this.gl;
    if (mesh.terrainVao) gl.deleteVertexArray(mesh.terrainVao);
    if (mesh.terrainVbo) gl.deleteBuffer(mesh.terrainVbo);
    if (mesh.waterVao) gl.deleteVertexArray(mesh.waterVao);
    if (mesh.waterVbo) gl.deleteBuffer(mesh.waterVbo);
    if (mesh.overWaterVao) gl.deleteVertexArray(mesh.overWaterVao);
    if (mesh.overWaterVbo) gl.deleteBuffer(mesh.overWaterVbo);
    chunk.renderCache = null;
  }

  flush(): void {
    if (this.quadCount === 0) return;

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uMatrixLoc, false, this.getMatrix());

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.quadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX));

    gl.drawElements(gl.TRIANGLES, this.quadCount * this.INDICES_PER_QUAD, gl.UNSIGNED_SHORT, 0);

    this.drawCalls++;
    this.quadCount = 0;
  }

  drawWaterBatch(tiles: WaterTileRenderData[], time: number): void {
    if (tiles.length === 0) return;
    this.flush(); // Flush standard quads first

    const gl = this.gl;
    const count = Math.min(tiles.length, this.MAX_WATER_TILES);
    let offset = 0;

    for (let i = 0; i < count; i++) {
      const t = tiles[i];
      const x0 = t.x, y0 = t.y;
      const x1 = t.x + t.w, y1 = t.y + t.h;
      const fx = t.flowX, fy = t.flowY;
      const depth = t.depth;
      const foam = t.foamMask;
      const isFall = t.isWaterfall ? 1.0 : 0.0;

      // Vertex 0 (TL)
      this.waterVertexData[offset + 0] = x0;
      this.waterVertexData[offset + 1] = y0;
      this.waterVertexData[offset + 2] = 0;
      this.waterVertexData[offset + 3] = 0;
      this.waterVertexData[offset + 4] = fx;
      this.waterVertexData[offset + 5] = fy;
      this.waterVertexData[offset + 6] = depth;
      this.waterVertexData[offset + 7] = foam;
      this.waterVertexData[offset + 8] = isFall;
      this.waterVertexData[offset + 9] = 0;

      // Vertex 1 (TR)
      this.waterVertexData[offset + 10] = x1;
      this.waterVertexData[offset + 11] = y0;
      this.waterVertexData[offset + 12] = 1;
      this.waterVertexData[offset + 13] = 0;
      this.waterVertexData[offset + 14] = fx;
      this.waterVertexData[offset + 15] = fy;
      this.waterVertexData[offset + 16] = depth;
      this.waterVertexData[offset + 17] = foam;
      this.waterVertexData[offset + 18] = isFall;
      this.waterVertexData[offset + 19] = 0;

      // Vertex 2 (BR)
      this.waterVertexData[offset + 20] = x1;
      this.waterVertexData[offset + 21] = y1;
      this.waterVertexData[offset + 22] = 1;
      this.waterVertexData[offset + 23] = 1;
      this.waterVertexData[offset + 24] = fx;
      this.waterVertexData[offset + 25] = fy;
      this.waterVertexData[offset + 26] = depth;
      this.waterVertexData[offset + 27] = foam;
      this.waterVertexData[offset + 28] = isFall;
      this.waterVertexData[offset + 29] = 0;

      // Vertex 3 (BL)
      this.waterVertexData[offset + 30] = x0;
      this.waterVertexData[offset + 31] = y1;
      this.waterVertexData[offset + 32] = 0;
      this.waterVertexData[offset + 33] = 1;
      this.waterVertexData[offset + 34] = fx;
      this.waterVertexData[offset + 35] = fy;
      this.waterVertexData[offset + 36] = depth;
      this.waterVertexData[offset + 37] = foam;
      this.waterVertexData[offset + 38] = isFall;
      this.waterVertexData[offset + 39] = 0;

      offset += 40;
    }

    gl.useProgram(this.waterProgram);
    gl.uniformMatrix3fv(this.uWaterMatrixLoc, false, this.getMatrix());
    gl.uniform1f(this.uWaterTimeLoc, time);

    gl.bindVertexArray(this.waterVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.waterVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.waterVertexData.subarray(0, count * this.VERTICES_PER_QUAD * this.FLOATS_PER_WATER_VERTEX));

    gl.drawElements(gl.TRIANGLES, count * this.INDICES_PER_QUAD, gl.UNSIGNED_SHORT, 0);

    this.drawCalls++;
  }

  drawQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    color: ColorRGBA = { r: 1, g: 1, b: 1, a: 1 },
    u0: number = 0,
    v0: number = 0,
    u1: number = 1,
    v1: number = 1
  ): void {
    if (this.quadCount >= this.MAX_QUADS) {
      this.flush();
    }

    const offset = this.quadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX;
    const r = color.r, g = color.g, b = color.b, a = color.a;

    const x0 = x;
    const y0 = y;
    const x1 = x + w;
    const y1 = y + h;

    // Vertex 0 (Top-Left)
    this.vertexData[offset + 0] = x0;
    this.vertexData[offset + 1] = y0;
    this.vertexData[offset + 2] = u0;
    this.vertexData[offset + 3] = v0;
    this.vertexData[offset + 4] = r;
    this.vertexData[offset + 5] = g;
    this.vertexData[offset + 6] = b;
    this.vertexData[offset + 7] = a;

    // Vertex 1 (Top-Right)
    this.vertexData[offset + 8] = x1;
    this.vertexData[offset + 9] = y0;
    this.vertexData[offset + 10] = u1;
    this.vertexData[offset + 11] = v0;
    this.vertexData[offset + 12] = r;
    this.vertexData[offset + 13] = g;
    this.vertexData[offset + 14] = b;
    this.vertexData[offset + 15] = a;

    // Vertex 2 (Bottom-Right)
    this.vertexData[offset + 16] = x1;
    this.vertexData[offset + 17] = y1;
    this.vertexData[offset + 18] = u1;
    this.vertexData[offset + 19] = v1;
    this.vertexData[offset + 20] = r;
    this.vertexData[offset + 21] = g;
    this.vertexData[offset + 22] = b;
    this.vertexData[offset + 23] = a;

    // Vertex 3 (Bottom-Left)
    this.vertexData[offset + 24] = x0;
    this.vertexData[offset + 25] = y1;
    this.vertexData[offset + 26] = u0;
    this.vertexData[offset + 27] = v1;
    this.vertexData[offset + 28] = r;
    this.vertexData[offset + 29] = g;
    this.vertexData[offset + 30] = b;
    this.vertexData[offset + 31] = a;

    this.quadCount++;
  }

  drawRect(x: number, y: number, w: number, h: number, color: ColorRGBA): void {
    this.drawQuad(x, y, w, h, color);
  }

  drawCircle(cx: number, cy: number, radius: number, color: ColorRGBA): void {
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * radius;
      const y0 = cy + Math.sin(a0) * radius;
      const x1 = cx + Math.cos(a1) * radius;
      const y1 = cy + Math.sin(a1) * radius;
      this.drawTriangle(cx, cy, x0, y0, x1, y1, color);
    }
  }

  private drawTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: ColorRGBA): void {
    if (this.quadCount >= this.MAX_QUADS) {
      this.flush();
    }
    const offset = this.quadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX;
    const r = color.r, g = color.g, b = color.b, a = color.a;

    // V0
    this.vertexData[offset + 0] = x0;
    this.vertexData[offset + 1] = y0;
    this.vertexData[offset + 2] = 0;
    this.vertexData[offset + 3] = 0;
    this.vertexData[offset + 4] = r;
    this.vertexData[offset + 5] = g;
    this.vertexData[offset + 6] = b;
    this.vertexData[offset + 7] = a;

    // V1
    this.vertexData[offset + 8] = x1;
    this.vertexData[offset + 9] = y1;
    this.vertexData[offset + 10] = 0;
    this.vertexData[offset + 11] = 0;
    this.vertexData[offset + 12] = r;
    this.vertexData[offset + 13] = g;
    this.vertexData[offset + 14] = b;
    this.vertexData[offset + 15] = a;

    // V2
    this.vertexData[offset + 16] = x2;
    this.vertexData[offset + 17] = y2;
    this.vertexData[offset + 18] = 0;
    this.vertexData[offset + 19] = 0;
    this.vertexData[offset + 20] = r;
    this.vertexData[offset + 21] = g;
    this.vertexData[offset + 22] = b;
    this.vertexData[offset + 23] = a;

    // V3 (duplicate of V2 for quad batching)
    this.vertexData[offset + 24] = x2;
    this.vertexData[offset + 25] = y2;
    this.vertexData[offset + 26] = 0;
    this.vertexData[offset + 27] = 0;
    this.vertexData[offset + 28] = r;
    this.vertexData[offset + 29] = g;
    this.vertexData[offset + 30] = b;
    this.vertexData[offset + 31] = a;

    this.quadCount++;
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, width: number, color: ColorRGBA): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;
    const nx = (-dy / len) * (width / 2);
    const ny = (dx / len) * (width / 2);

    this.drawTriangle(x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, color);
    this.drawTriangle(x1 + nx, y1 + ny, x2 - nx, y2 - ny, x1 - nx, y1 - ny, color);
  }

  drawPolygon(points: Vec2[], color: ColorRGBA): void {
    if (points.length < 3) return;
    for (let i = 1; i < points.length - 1; i++) {
      this.drawTriangle(points[0].x, points[0].y, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, color);
    }
  }

  endFrame(): void {
    this.flush();
  }

  getStats(): RenderStats {
    return {
      drawCalls: this.drawCalls,
      quadsCount: this.quadCount,
      backend: 'webgl2'
    };
  }
}
