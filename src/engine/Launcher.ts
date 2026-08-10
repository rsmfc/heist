/**
 * Interactive 3D Slingshot / Thermal Drill Launcher for Vault Heist
 * Real Angry Balls slingshot mechanics: drag back to stretch elastic bands, power = tension distance.
 * No cheat trajectory line -- players use visual judgment for pitch, yaw, and power!
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { VaultMaterials } from './Materials';
import { PhysicsWorld } from './PhysicsWorld';

export interface AimState {
  pitch: number;  // Vertical angle in rad
  yaw: number;    // Horizontal angle in rad
  power: number;  // 0.0 to 1.0 tension
}

export class LauncherManager {
  public launcherGroup: THREE.Group;
  public aimState: AimState = { pitch: 0.3, yaw: 0.0, power: 0.6 };
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private materials: VaultMaterials;

  // Slingshot Prongs & Bands
  private bandLeft: THREE.Line;
  private bandRight: THREE.Line;
  private pouchMesh: THREE.Mesh;
  private leftProngPos = new THREE.Vector3(0, 1.5, -0.65);
  private rightProngPos = new THREE.Vector3(0, 1.5, 0.65);

  // Active Projectile State
  public activeProjectileMesh: THREE.Mesh | null = null;
  public activeProjectileBody: CANNON.Body | null = null;
  public isBombProjectile: boolean = false;

  public originPos = new THREE.Vector3(-9.5, 1.8, 0);

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld, materials: VaultMaterials) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.materials = materials;

    this.launcherGroup = new THREE.Group();
    this.launcherGroup.position.copy(this.originPos);
    this.scene.add(this.launcherGroup);

    // Slingshot Elastic Bands
    const bandMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 5 });
    this.bandLeft = new THREE.Line(new THREE.BufferGeometry(), bandMat);
    this.bandRight = new THREE.Line(new THREE.BufferGeometry(), bandMat);
    this.launcherGroup.add(this.bandLeft);
    this.launcherGroup.add(this.bandRight);

    // Slingshot Leather Pouch / Pocket
    const pouchGeom = new THREE.BoxGeometry(0.3, 0.35, 0.45);
    const pouchMat = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.8 });
    this.pouchMesh = new THREE.Mesh(pouchGeom, pouchMat);
    this.launcherGroup.add(this.pouchMesh);

    this.buildLauncherModel();
    this.updateSlingshotVisuals();
  }

  private buildLauncherModel(): void {
    // 1. Heavy Industrial Metallic Base
    const baseGeom = new THREE.CylinderGeometry(0.9, 1.3, 0.4, 16);
    const baseMesh = new THREE.Mesh(baseGeom, this.materials.steel);
    baseMesh.position.set(0, -0.2, 0);
    this.launcherGroup.add(baseMesh);

    // 2. Main Y-Fork Steel Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.22, 0.32, 1.1, 12);
    const trunkMesh = new THREE.Mesh(trunkGeom, this.materials.steel);
    trunkMesh.position.set(0, 0.55, 0);
    this.launcherGroup.add(trunkMesh);

    // 3. Left & Right Slingshot Prongs
    const prongGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.9, 12);
    
    const leftProng = new THREE.Mesh(prongGeom, this.materials.concrete);
    leftProng.position.copy(this.leftProngPos);
    leftProng.rotation.z = -0.2;
    leftProng.rotation.x = -0.15;

    const rightProng = new THREE.Mesh(prongGeom, this.materials.concrete);
    rightProng.position.copy(this.rightProngPos);
    rightProng.rotation.z = -0.2;
    rightProng.rotation.x = 0.15;

    this.launcherGroup.add(leftProng);
    this.launcherGroup.add(rightProng);
  }

  public setAim(pitch: number, yaw: number, power: number): void {
    this.aimState.pitch = Math.max(0.05, Math.min(Math.PI / 2.8, pitch));
    this.aimState.yaw = Math.max(-Math.PI / 3.5, Math.min(Math.PI / 3.5, yaw));
    this.aimState.power = Math.max(0.15, Math.min(1.0, power));

    this.updateSlingshotVisuals();
  }

  public updateSlingshotVisuals(): void {
    // Pullback vector extending backwards based on pitch, yaw, and power tension
    const pullDistance = 0.3 + this.aimState.power * 1.4;
    const pocketPos = new THREE.Vector3(
      -Math.cos(this.aimState.pitch) * Math.cos(this.aimState.yaw) * pullDistance,
      1.35 - Math.sin(this.aimState.pitch) * pullDistance * 0.75,
      -Math.sin(this.aimState.yaw) * pullDistance
    );

    this.pouchMesh.position.copy(pocketPos);
    this.pouchMesh.rotation.x = -this.aimState.pitch;
    this.pouchMesh.rotation.y = this.aimState.yaw;

    // Update Elastic Band 3D Positions
    const leftPositions = new Float32Array([
      this.leftProngPos.x, this.leftProngPos.y, this.leftProngPos.z,
      pocketPos.x, pocketPos.y, pocketPos.z
    ]);
    this.bandLeft.geometry.setAttribute('position', new THREE.BufferAttribute(leftPositions, 3));
    this.bandLeft.geometry.attributes.position.needsUpdate = true;

    const rightPositions = new Float32Array([
      this.rightProngPos.x, this.rightProngPos.y, this.rightProngPos.z,
      pocketPos.x, pocketPos.y, pocketPos.z
    ]);
    this.bandRight.geometry.setAttribute('position', new THREE.BufferAttribute(rightPositions, 3));
    this.bandRight.geometry.attributes.position.needsUpdate = true;
  }

  public setTrajectoryVisible(visible: boolean): void {
    this.bandLeft.visible = visible;
    this.bandRight.visible = visible;
    this.pouchMesh.visible = visible;
  }

  public getInitialVelocity(): THREE.Vector3 {
    // Launch speed dynamically scales with pull tension (16 to 52 m/s!)
    const speed = 16 + Math.pow(this.aimState.power, 1.3) * 36;
    const vx = Math.cos(this.aimState.pitch) * Math.cos(this.aimState.yaw) * speed;
    const vy = Math.sin(this.aimState.pitch) * speed;
    const vz = Math.sin(this.aimState.yaw) * speed;
    return new THREE.Vector3(vx, vy, vz);
  }

  /**
   * Launch Projectile into 3D Physics Space
   */
  public launch(isBomb: boolean = false): void {
    this.clearActiveProjectile();
    this.isBombProjectile = isBomb;

    const vel = this.getInitialVelocity();
    const radius = isBomb ? 0.48 : 0.38;
    const mat = isBomb ? this.materials.bombProjectile : this.materials.projectile;

    const geom = isBomb ? new THREE.SphereGeometry(radius, 20, 20) : new THREE.CylinderGeometry(radius * 0.7, radius, 1.2, 16);
    if (!isBomb) geom.rotateX(Math.PI / 2);
    
    this.activeProjectileMesh = new THREE.Mesh(geom, mat);
    this.activeProjectileMesh.position.copy(this.originPos);
    this.activeProjectileMesh.position.add(this.pouchMesh.position);
    this.scene.add(this.activeProjectileMesh);

    const shape = isBomb ? new CANNON.Sphere(radius) : new CANNON.Cylinder(radius * 0.7, radius, 1.2, 16);
    this.activeProjectileBody = new CANNON.Body({
      mass: isBomb ? 8.0 : 5.0,
      position: new CANNON.Vec3(this.activeProjectileMesh.position.x, this.activeProjectileMesh.position.y, this.activeProjectileMesh.position.z)
    });
    this.activeProjectileBody.addShape(shape);
    this.activeProjectileBody.velocity.set(vel.x, vel.y, vel.z);

    this.physicsWorld.world.addBody(this.activeProjectileBody);
  }

  public clearActiveProjectile(): void {
    if (this.activeProjectileMesh) {
      this.scene.remove(this.activeProjectileMesh);
      this.activeProjectileMesh = null;
    }
    if (this.activeProjectileBody) {
      this.physicsWorld.world.removeBody(this.activeProjectileBody);
      this.activeProjectileBody = null;
    }
  }

  public update(): void {
    if (this.activeProjectileMesh && this.activeProjectileBody) {
      this.activeProjectileMesh.position.copy(this.activeProjectileBody.position as unknown as THREE.Vector3);
      this.activeProjectileMesh.quaternion.copy(this.activeProjectileBody.quaternion as unknown as THREE.Quaternion);
    }
  }
}
