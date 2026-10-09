import { ColorRGBA, Vec2, vec2 } from '../core/math';
import { IRenderer, RenderStats } from './types';

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

export class WebGL2Renderer implements IRenderer {
  readonly backend = 'webgl2' as const;
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  width: number = 0;
  height: number = 0;
  dpr: number = 1;

  private cameraPos: Vec2 = vec2(0, 0);
  private cameraZoom: number = 1;

  // Batching constants
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
    this.initGL();
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

  flush(): void {
    if (this.quadCount === 0) return;

    const gl = this.gl;
    gl.useProgram(this.program);

    // Compute 3x3 transformation matrix (World -> NDC)
    // 1. World to Screen: S_zoom * (world - camera) + (screenCenter)
    // 2. Screen to NDC: x_ndc = (x / width) * 2 - 1, y_ndc = 1 - (y / height) * 2
    const w = this.width;
    const h = this.height;
    const zoom = this.cameraZoom;
    const cx = this.cameraPos.x;
    const cy = this.cameraPos.y;

    const sx = (2 * zoom) / w;
    const sy = (-2 * zoom) / h;
    const tx = -cx * sx;
    const ty = -cy * sy;

    // Mat3 column-major
    const mat = new Float32Array([
      sx, 0, 0,
      0, sy, 0,
      tx, ty, 1
    ]);
    gl.uniformMatrix3fv(this.uMatrixLoc, false, mat);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.quadCount * this.VERTICES_PER_QUAD * this.FLOATS_PER_VERTEX));

    gl.drawElements(gl.TRIANGLES, this.quadCount * this.INDICES_PER_QUAD, gl.UNSIGNED_SHORT, 0);

    this.drawCalls++;
    this.quadCount = 0;
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
    // Approximate circle with segmented fan quads
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

    // Repeat vertex 2 for 4th vertex
    const pts = [[x0, y0], [x1, y1], [x2, y2], [x2, y2]];
    for (let i = 0; i < 4; i++) {
      const idx = offset + i * 8;
      this.vertexData[idx + 0] = pts[i][0];
      this.vertexData[idx + 1] = pts[i][1];
      this.vertexData[idx + 2] = 0;
      this.vertexData[idx + 3] = 0;
      this.vertexData[idx + 4] = r;
      this.vertexData[idx + 5] = g;
      this.vertexData[idx + 6] = b;
      this.vertexData[idx + 7] = a;
    }
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
