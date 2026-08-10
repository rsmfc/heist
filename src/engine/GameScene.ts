/**
 * Main 3D WebGL Game Scene Orchestrator for Vault Heist
 * Features bright 4-point studio lighting, high visibility, bank vault room architecture, and camera tracking.
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

  // High-Visibility Side-Isometric Camera Angle
  private defaultCamPos = new THREE.Vector3(-10.5, 7.5, 17.0);
  private defaultCamLook = new THREE.Vector3(3.5, 2.5, 0);
  private targetCamPos = new THREE.Vector3(-10.5, 7.5, 17.0);
  private targetCamLook = new THREE.Vector3(3.5, 2.5, 0);
  private currentCamLook = new THREE.Vector3(3.5, 2.5, 0);

  // Screen Shake Intensity
  private shakeIntensity: number = 0;

  // UI Callback hooks
  public onMultiplierUpdate?: (mult: number) => void;
  public onRoundComplete?: (result: RoundResult, finalMult: number) => void;

  private isDragging: boolean = false;
  private dragStartPos = { x: 0, y: 0 };
  private clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. WebGL Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Camera Setup (Bright Slate Navy BG, NO pitch black!)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 150);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultCamLook);

    // 3. Modules Setup
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

    this.resetRound(this.currentMode);
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.animate();
  }

  private setupEnvironment(): void {
    // 1. Polished Cyber Floor Tiles with Glowing Cyan Grid
    const floorGeom = new THREE.PlaneGeometry(80, 60);
    const floorMesh = new THREE.Mesh(floorGeom, this.materials.floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(5, 0, 0);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Floor Grid Overlay
    const floorGrid = new THREE.GridHelper(80, 40, 0x00ffff, 0x1e293b);
    floorGrid.position.set(5, 0.02, 0);
    this.scene.add(floorGrid);

    // 2. Heavy Metallic Bank Vault Door Wall (at x = 20)
    const backWallGeom = new THREE.PlaneGeometry(60, 30);
    const backWallMesh = new THREE.Mesh(backWallGeom, this.materials.wall);
    backWallMesh.rotation.y = -Math.PI / 2;
    backWallMesh.position.set(20, 15, 0);
    backWallMesh.receiveShadow = true;
    this.scene.add(backWallMesh);

    // Bank Vault Round Door Model (Center at x = 19.9, y = 6.5, z = 0)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(19.8, 6.5, 0);
    doorGroup.rotation.y = -Math.PI / 2;

    const doorRingGeom = new THREE.TorusGeometry(5.0, 0.4, 16, 48);
    const doorRingMesh = new THREE.Mesh(doorRingGeom, this.materials.steel);
    doorGroup.add(doorRingMesh);

    const doorCenterGeom = new THREE.CylinderGeometry(4.6, 4.6, 0.4, 32);
    const doorCenterMesh = new THREE.Mesh(doorCenterGeom, this.materials.gold);
    doorCenterMesh.rotation.x = Math.PI / 2;
    doorGroup.add(doorCenterMesh);

    this.scene.add(doorGroup);

    // 3. Bright Studio 4-Point Lighting (NO pitch black areas!)
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);

    // Main Sun Key Light
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(-5, 20, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);

    // Spotlight on Slingshot
    const slingshotSpot = new THREE.SpotLight(0x00f0ff, 3.5);
    slingshotSpot.position.set(-14, 14, 8);
    slingshotSpot.target = this.launcherManager.launcherGroup;
    this.scene.add(slingshotSpot);

    // Warm Gold Spotlight on Vault Tower
    const towerSpot = new THREE.SpotLight(0xffd700, 3.5);
    towerSpot.position.set(4, 16, 12);
    towerSpot.target.position.set(8, 3, 0);
    this.scene.add(towerSpot);

    // Side Hazard Orange Fill Light
    const fillLight = new THREE.PointLight(0xff3300, 2.5, 45);
    fillLight.position.set(16, 10, 8);
    this.scene.add(fillLight);
  }

  private setupInteractions(): void {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!this.isAiming || this.isRoundInFlight) return;
      this.isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      this.dragStartPos = { x: clientX, y: clientY };
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging || !this.isAiming || this.isRoundInFlight) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - this.dragStartPos.x;
      const deltaY = clientY - this.dragStartPos.y;

      const pullDist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const power = Math.min(1.0, pullDist / 160);

      const yaw = (deltaX / 200) * (Math.PI / 3.5);
      const pitch = 0.15 + (deltaY / 160) * (Math.PI / 3);

      this.launcherManager.setAim(pitch, yaw, power);
      this.soundEngine.playStretch(power);
    };

    const onUp = () => {
      if (this.isDragging && this.isAiming && !this.isRoundInFlight) {
        this.isDragging = false;
        this.fireShot();
      }
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

    // Reset Camera Position
    this.targetCamPos.copy(this.defaultCamPos);
    this.targetCamLook.copy(this.defaultCamLook);

    if (this.onMultiplierUpdate) this.onMultiplierUpdate(0);

    // Calculate Provably Fair Math outcome for round
    this.currentRoundResult = this.provablyFair.calculateRound(mode);

    // Build Vault Tower structure
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

    // Camera track downfield toward target tower
    this.targetCamPos.set(-2.0, 6.5, 14.0);
    this.targetCamLook.set(7.5, 3.0, 0);

    // Safety fallback timer to resolve round if physics gets stuck
    this.safetyTimer = window.setTimeout(() => {
      if (this.isRoundInFlight) {
        this.finishRound();
      }
    }, 4500);

    return true;
  }

  public addScreenShake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private checkCollisions(): void {
    if (!this.isRoundInFlight || !this.launcherManager.activeProjectileBody) return;

    const projPos = this.launcherManager.activeProjectileMesh?.position;
    if (!projPos) return;

    // Camera dynamic flight tracking
    this.targetCamPos.set(
      Math.min(5.0, projPos.x - 5.5),
      Math.max(4.0, projPos.y + 2.5),
      projPos.z + 4.5
    );
    this.targetCamLook.set(projPos.x + 3.0, projPos.y, projPos.z);

    // Rocket exhaust smoke trail
    this.particleSystem.spawnRocketExhaust(projPos);

    // Check hit against structure blocks
    this.structureManager.blocks.forEach(block => {
      if (block.isDestroyed) return;

      const dist = block.mesh.position.distanceTo(projPos);
      if (dist < 1.3) {
        // Block Impact!
        block.health--;
        this.soundEngine.playImpact();
        this.addScreenShake(0.1);

        if (block.health <= 0) {
          block.isDestroyed = true;
          this.scene.remove(block.mesh);

          // Calculate payout value
          let gainedMult = block.multiplierValue;
          
          if (this.currentRoundResult) {
            const remainingTarget = Math.max(0, this.currentRoundResult.multiplier - this.accumulatedMultiplier);
            gainedMult = Math.min(gainedMult, remainingTarget);
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

          // Particles & Explosions
          if (block.type === 'glass') {
            this.soundEngine.playGlassShatter();
            this.particleSystem.spawnGlassShards(block.mesh.position);
          } else if (block.type === 'gold' || block.type === 'diamond') {
            this.particleSystem.spawnGoldExplosion(block.mesh.position);
          } else if (block.type === 'tnt') {
            this.soundEngine.playExplosion();
            this.particleSystem.spawnExplosion(block.mesh.position);
            this.addScreenShake(0.35);

            const blastCenter = block.mesh.position.clone();
            this.physicsWorld.applyExplosionImpulse(blastCenter, 9, 55);

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

    // Back wall & ground collision settling check
    const vel = this.launcherManager.activeProjectileBody.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

    if (!this.roundFinishPending) {
      if (projPos.x >= 19.2 || projPos.y < 0.35 || projPos.x < -18 || (speed < 0.3 && projPos.x > 0)) {
        if (projPos.x >= 19.0) {
          // Impact with Far Back Wall!
          this.soundEngine.playImpact(2.0);
          this.particleSystem.spawnExplosion(projPos, 15);
          this.addScreenShake(0.25);
        }
        this.roundFinishPending = true;
        this.finishTimer = window.setTimeout(() => {
          if (this.isRoundInFlight) {
            this.finishRound();
          }
        }, 600);
      }
    }
  }

  private finishRound(): void {
    if (!this.isRoundInFlight || !this.currentRoundResult) return;

    this.cancelTimers();
    this.isRoundInFlight = false;

    // Payout is strictly what player physically hit & collected during flight!
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

    // Smooth Camera Flight Tracking
    this.camera.position.lerp(this.targetCamPos, dt * 3.5);
    this.currentCamLook.lerp(this.targetCamLook, dt * 3.5);

    // Apply Screen Shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.5);
    }

    this.camera.lookAt(this.currentCamLook);

    // Physics & Animation Step
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
