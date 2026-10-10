import * as THREE from 'three';

export class Renderer3D {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  
  public width: number = 0;
  public height: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // controlled by quality scaler later
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Soft toon lighting shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#87CEEB'); // Sky blue base
    
    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);
  }

  public resize(width: number, height: number, pixelRatio: number): void {
    this.width = width;
    this.height = height;
    
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(pixelRatio);
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  public clear(): void {
    // handled by renderer.render automatically if autoClear is true
  }
}
