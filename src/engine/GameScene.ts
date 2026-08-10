/**
 * Main 3D WebGL Game Scene Orchestrator for Vault Heist
 * Manages Three.js rendering, lighting, camera controls, collision events, and round resolution.
 */

import * as THREE from 'three';
import { createVaultMaterials } from './Materials';
import type { VaultMaterials } from './Materials';
import { PhysicsWorld } from './PhysicsWorld';
import { VaultStructureManager } from './VaultStructure';
import { LauncherManager } from './Launcher';
import { ParticleSystem } from './Particles';
import { FloatingTextManager } from './FloatingText';
import { SoundEngine } from '../audio/SoundEngine';
import { ProvablyFairEngine } from '../math/ProvablyFair';
import type { GameMode, RoundResult } from '../math/ProvablyFair';

export class GameScene {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  public materials: VaultMaterials;
  public physicsWorld: PhysicsWorld;
  public structureManager: VaultStructureManager;
  public launcherManager: LauncherManager;
  public particleSystem: ParticleSystem;
  public floatingTextManager: FloatingTextManager;
  public soundEngine: SoundEngine;
  public provablyFair: ProvablyFairEngine;

  // Round State
  public currentMode: GameMode = 'standard';
  public isAiming: boolean = true;
  public isRoundInFlight: boolean = false;
  public currentRoundResult: RoundResult | null = null;
  public accumulatedMultiplier: number = 0;

  private roundFinishPending: boolean = false;
  private finishTimer: number | null = null;
  private safetyTimer: number | null = null;

  // UI Callback hooks
  public onMultiplierUpdate?: (mult: number) => void;
  public onRoundComplete?: (result: RoundResult, finalMult: number) => void;

  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c10);
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.035);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(-6, 4, 12);
    this.camera.lookAt(2, 2, 0);

    // 3. Modules Initialization
    this.materials = createVaultMaterials();
    this.physicsWorld = new PhysicsWorld();
    this.physicsWorld.createGround();

    this.soundEngine = new SoundEngine();
    this.provablyFair = new ProvablyFairEngine();

    this.structureManager = new VaultStructureManager(this.scene, this.physicsWorld, this.materials);
    this.launcherManager = new LauncherManager(this.scene, this.physicsWorld, this.materials);
    this.particleSystem = new ParticleSystem(this.scene);
    this.floatingTextManager = new FloatingTextManager(this.camera);

    this.setupEnvironment();
    this.setupInteractions();

    // Build initial tower
    this.resetRound(this.currentMode);

    // Resize Handler
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Start Render Loop
    this.animate();
  }

  private setupEnvironment(): void {
    // Ground Mesh
    const floorGeom = new THREE.PlaneGeometry(50, 50);
    const floorMesh = new THREE.Mesh(floorGeom, this.materials.floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Vault Back Wall with Security Grid Light Effect
    const wallGeom = new THREE.PlaneGeometry(50, 20);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x121620,
      roughness: 0.8,
      metalness: 0.4
    });
    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.position.set(0, 10, -10);
    this.scene.add(wallMesh);

    // Ambient Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Key Spotlight on Target Tower
    const keySpot = new THREE.SpotLight(0x00f0ff, 2.5);
    keySpot.position.set(2, 14, 10);
    keySpot.target.position.set(8, 2, 0);
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 1024;
    keySpot.shadow.mapSize.height = 1024;
    this.scene.add(keySpot);
    this.scene.add(keySpot.target);

    // Hazard Orange Side Fill Light
    const fillLight = new THREE.PointLight(0xff3b00, 1.8, 25);
    fillLight.position.set(12, 6, 4);
    this.scene.add(fillLight);
  }

  private setupInteractions(): void {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!this.isAiming || this.isRoundInFlight) return;
      this.isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging || !this.isAiming || this.isRoundInFlight) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - this.previousMousePosition.x;
      const deltaY = clientY - this.previousMousePosition.y;

      const currentAim = this.launcherManager.aimState;
      const newPitch = currentAim.pitch + deltaY * 0.005;
      const newYaw = currentAim.yaw + deltaX * 0.005;
      const newPower = currentAim.power;

      this.launcherManager.setAim(newPitch, newYaw, newPower);
      this.soundEngine.playStretch(newPower);

      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onUp = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    this.canvas.addEventListener('touchstart', onDown);
    this.canvas.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  }

  private cancelTimers(): void {
    if (this.finishTimer !== null) {
      clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    this.roundFinishPending = false;
  }

  public resetRound(mode: GameMode): void {
    this.cancelTimers();

    this.currentMode = mode;
    this.isAiming = true;
    this.isRoundInFlight = false;
    this.accumulatedMultiplier = 0;
    this.soundEngine.resetCombo();

    if (this.onMultiplierUpdate) this.onMultiplierUpdate(0);

    // Calculate Provably Fair Math outcome for round
    this.currentRoundResult = this.provablyFair.calculateRound(mode);

    // Build Vault Tower structure matching result requirements
    this.structureManager.buildVaultStructure(mode, this.currentRoundResult.targetHitCount);
    this.launcherManager.clearActiveProjectile();
    this.launcherManager.setTrajectoryVisible(true);
  }

  public fireShot(): boolean {
    if (!this.isAiming || this.isRoundInFlight || !this.currentRoundResult) return false;

    this.cancelTimers();
    this.isAiming = false;
    this.isRoundInFlight = true;
    this.launcherManager.setTrajectoryVisible(false);

    const isBomb = this.currentMode === 'bomb' || this.currentMode === 'max_vault';
    this.soundEngine.playLaunch(isBomb);
    this.launcherManager.launch(isBomb);

    // Safety fallback timer to resolve round if physics gets stuck
    this.safetyTimer = window.setTimeout(() => {
      if (this.isRoundInFlight) {
        this.finishRound();
      }
    }, 4500);

    return true;
  }

  private checkCollisions(): void {
    if (!this.isRoundInFlight || !this.launcherManager.activeProjectileBody) return;

    const projPos = this.launcherManager.activeProjectileMesh?.position;
    if (!projPos) return;

    // Spawn rocket exhaust smoke trail
    this.particleSystem.spawnRocketExhaust(projPos);

    // Check hit against structure blocks
    this.structureManager.blocks.forEach(block => {
      if (block.isDestroyed) return;

      const dist = block.mesh.position.distanceTo(projPos);
      if (dist < 1.3) {
        // Block Impact!
        block.health--;
        this.soundEngine.playImpact();

        if (block.health <= 0) {
          block.isDestroyed = true;
          this.scene.remove(block.mesh);

          // Calculate payout value
          let gainedMult = block.multiplierValue;
          
          // Cap total to calculated Provably Fair outcome
          if (this.currentRoundResult) {
            const remainingTarget = this.currentRoundResult.multiplier - this.accumulatedMultiplier;
            if (remainingTarget > 0) {
              gainedMult = Math.min(gainedMult, remainingTarget);
            }
          }

          if (gainedMult > 0) {
            this.accumulatedMultiplier += gainedMult;
            this.accumulatedMultiplier = Math.round(this.accumulatedMultiplier * 100) / 100;

            this.soundEngine.playCoinCollect(this.accumulatedMultiplier);
            this.floatingTextManager.spawnText(block.mesh.position, gainedMult, block.type === 'diamond');

            if (this.onMultiplierUpdate) {
              this.onMultiplierUpdate(this.accumulatedMultiplier);
            }
          }

          // Particles
          if (block.type === 'glass') {
            this.soundEngine.playGlassShatter();
            this.particleSystem.spawnGlassShards(block.mesh.position);
          } else if (block.type === 'gold' || block.type === 'diamond') {
            this.particleSystem.spawnGoldExplosion(block.mesh.position);
          } else if (block.type === 'tnt') {
            this.soundEngine.playExplosion();
            this.particleSystem.spawnExplosion(block.mesh.position);
            const blastCenter = block.mesh.position.clone();
            this.physicsWorld.applyExplosionImpulse(blastCenter, 9, 50);

            // Explosive blast wave damages & collects adjacent blocks
            this.structureManager.blocks.forEach(adjBlock => {
              if (adjBlock.isDestroyed || adjBlock.id === block.id) return;
              const d = adjBlock.mesh.position.distanceTo(blastCenter);
              if (d < 5.0) {
                adjBlock.health -= 2;
                if (adjBlock.health <= 0) {
                  adjBlock.isDestroyed = true;
                  this.scene.remove(adjBlock.mesh);

                  let gainedMult = adjBlock.multiplierValue;
                  if (this.currentRoundResult) {
                    const remainingTarget = Math.max(0, this.currentRoundResult.multiplier - this.accumulatedMultiplier);
                    gainedMult = Math.min(gainedMult, remainingTarget);
                  }

                  if (gainedMult > 0) {
                    this.accumulatedMultiplier += gainedMult;
                    this.accumulatedMultiplier = Math.round(this.accumulatedMultiplier * 100) / 100;
                    this.soundEngine.playCoinCollect(this.accumulatedMultiplier);
                    this.floatingTextManager.spawnText(adjBlock.mesh.position, gainedMult, adjBlock.type === 'diamond');
                    if (this.onMultiplierUpdate) this.onMultiplierUpdate(this.accumulatedMultiplier);
                  }

                  if (adjBlock.type === 'glass') {
                    this.particleSystem.spawnGlassShards(adjBlock.mesh.position);
                  } else if (adjBlock.type === 'gold' || adjBlock.type === 'diamond') {
                    this.particleSystem.spawnGoldExplosion(adjBlock.mesh.position);
                  }
                }
              }
            });
          }
        }
      }
    });

    // Velocity & boundary settling check
    const vel = this.launcherManager.activeProjectileBody.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

    if (!this.roundFinishPending) {
      if (projPos.y < 0.35 || projPos.x > 22 || projPos.x < -15 || (speed < 0.3 && projPos.x > 0)) {
        this.roundFinishPending = true;
        this.finishTimer = window.setTimeout(() => {
          if (this.isRoundInFlight) {
            this.finishRound();
          }
        }, 700);
      }
    }
  }

  private finishRound(): void {
    if (!this.isRoundInFlight || !this.currentRoundResult) return;

    this.cancelTimers();
    this.isRoundInFlight = false;

    // The final round multiplier is STRICTLY what the player physically hit & collected during flight!
    const finalMult = Math.round(this.accumulatedMultiplier * 100) / 100;

    if (finalMult >= 10) {
      this.soundEngine.playBigWin();
    }

    if (this.onRoundComplete) {
      this.onRoundComplete(this.currentRoundResult, finalMult);
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Physics step
    this.physicsWorld.step(dt);
    this.structureManager.update();
    this.launcherManager.update();
    this.particleSystem.update(dt);
    this.floatingTextManager.update(dt);

    if (this.isRoundInFlight) {
      this.checkCollisions();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
