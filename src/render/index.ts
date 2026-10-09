import { IRenderer } from './types';
import { WebGL2Renderer } from './webgl2';
import { Canvas2DRenderer } from './canvas2d';

export * from './types';
export * from './webgl2';
export * from './canvas2d';

export function createRenderer(canvas: HTMLCanvasElement): IRenderer {
  try {
    const webgl = new WebGL2Renderer(canvas);
    console.log('[Renderer] Initialized WebGL2 batched backend');
    return webgl;
  } catch (err) {
    console.warn('[Renderer] WebGL2 initialization failed, falling back to Canvas 2D:', err);
    const canvas2d = new Canvas2DRenderer(canvas);
    console.log('[Renderer] Initialized Canvas 2D fallback backend');
    return canvas2d;
  }
}
