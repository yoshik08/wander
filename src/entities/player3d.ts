import * as THREE from 'three';
import { ChunkManager } from '../world/chunk-manager';
import { InputManager } from '../core/input';
import { clamp, lerp } from '../core/math';

export class Player3D {
  mesh: THREE.Group;
  body: THREE.Mesh;
  scarf: THREE.Mesh;
  cameraPivot: THREE.Group;
  
  pos: THREE.Vector3;
  velocity: THREE.Vector3;
  
  speed: number = 120.0;
  runSpeed: number = 220.0;
  jumpVelocity: number = 250.0;
  gravity: number = -600.0;
  
  isGrounded: boolean = false;
  yaw: number = 0; // Camera rotation
  pitch: number = Math.PI / 6; // Camera pitch
  targetZoom: number = 300;
  currentZoom: number = 300;
  
  isPointerDown: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.pos = new THREE.Vector3(0, 50, 0);
    this.velocity = new THREE.Vector3();
    
    this.mesh = new THREE.Group();
    
    // Procedural character mesh
    const bodyGeo = new THREE.CapsuleGeometry(8, 16, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.7 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 16;
    this.body.castShadow = true;
    this.mesh.add(this.body);
    
    // Scarf
    const scarfGeo = new THREE.BoxGeometry(10, 4, 4);
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.9 });
    this.scarf = new THREE.Mesh(scarfGeo, scarfMat);
    this.scarf.position.set(0, 24, -4);
    this.scarf.castShadow = true;
    this.mesh.add(this.scarf);
    
    scene.add(this.mesh);
    
    this.cameraPivot = new THREE.Group();
    scene.add(this.cameraPivot);
    this.cameraPivot.add(camera);
    camera.position.set(0, 0, this.currentZoom);
    camera.lookAt(0, 0, 0);

    // Camera controls
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', (e) => {
        if (e.clientX > window.innerWidth / 2) this.isPointerDown = true;
      });
      window.addEventListener('pointerup', () => this.isPointerDown = false);
      window.addEventListener('pointermove', (e) => {
        if (this.isPointerDown) {
          this.yaw -= e.movementX * 0.005;
          this.pitch -= e.movementY * 0.005;
        }
      });
      window.addEventListener('wheel', (e) => {
        this.targetZoom = clamp(this.targetZoom + e.deltaY * 0.5, 50, 600);
      });
    }
  }

  update(dt: number, inputState: import('../core/input').InputState, chunkManager: ChunkManager, camera: THREE.PerspectiveCamera) {
    
    // Mouse fallback for camera? We could use pointer lock.
    // For now, let's auto-recentre if moving, or just keep it simple.
    this.pitch = clamp(this.pitch, 0.1, Math.PI / 2 - 0.1);
    
    this.cameraPivot.position.copy(this.pos);
    this.cameraPivot.position.y += 20; // Look at head
    this.cameraPivot.rotation.y = this.yaw;
    this.cameraPivot.rotation.x = -this.pitch;
    
    // Movement relative to camera
    let moveDir = new THREE.Vector3(inputState.move.x, 0, inputState.move.y);
    if (moveDir.lengthSq() > 0.01) {
      moveDir.normalize();
      
      // Rotate moveDir by camera yaw
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      
      // Face movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      
      // Simple rotation interpolation
      let angleDiff = targetAngle - this.mesh.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.mesh.rotation.y += angleDiff * 10.0 * dt;
      
      const currentSpeed = inputState.isRunning ? this.runSpeed : this.speed;
      this.velocity.x = moveDir.x * currentSpeed;
      this.velocity.z = moveDir.z * currentSpeed;
      
      // Scarf animation (procedural)
      this.scarf.rotation.x = Math.sin(performance.now() * 0.01) * 0.2 + 0.2;
    } else {
      this.velocity.x = lerp(this.velocity.x, 0, 10.0 * dt);
      this.velocity.z = lerp(this.velocity.z, 0, 10.0 * dt);
      this.scarf.rotation.x = lerp(this.scarf.rotation.x, 0, 10.0 * dt);
    }
    
    // Jump
    if (inputState.actionPressed && this.isGrounded) {
      this.velocity.y = this.jumpVelocity;
      this.isGrounded = false;
    }
    
    // Gravity
    this.velocity.y += this.gravity * dt;
    
    // Apply velocity
    this.pos.addScaledVector(this.velocity, dt);
    
    // Collision with terrain
    const terrainHeight = Math.max(-50, chunkManager.getElevationAt(0, this.pos.x, this.pos.z));
    const isWater = chunkManager.isWaterAt(0, this.pos.x, this.pos.z);
    
    if (isWater && terrainHeight < -5) {
      // Swimming
      if (this.pos.y <= -2) {
        this.pos.y = -2;
        this.velocity.y = 0;
        this.isGrounded = true; // Can jump out of water
      } else {
        this.isGrounded = false;
      }
      this.speed = 60.0; // Slower swimming
      this.runSpeed = 100.0;
    } else {
      // Walking on land
      this.speed = 120.0;
      this.runSpeed = 220.0;
      
      if (this.pos.y <= Math.max(0, terrainHeight)) {
        this.pos.y = Math.max(0, terrainHeight);
        this.velocity.y = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    }
    
    this.mesh.position.copy(this.pos);
    
    // Smooth zoom
    this.currentZoom = lerp(this.currentZoom, this.targetZoom, 5.0 * dt);
    camera.position.z = this.currentZoom;
  }
}
