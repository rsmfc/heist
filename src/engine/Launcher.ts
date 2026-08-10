/**
 * Behind-the-Launcher 3D Slingshot Cannon for Vault Heist
 * Positioned in foreground looking straight downfield (-z direction) at the target bricks.
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
  public aimState: AimState = { pitch: 0.3, yaw: 0.0, power: 0.65 };
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private materials: VaultMaterials;

  // Slingshot Prongs & Bands
  private bandLeft: THREE.Line;
  private bandRight: THREE.Line;
  private pouchMesh: THREE.Mesh;
  private leftProngPos = new THREE.Vector3(-0.75, 1.6, 0);
  private rightProngPos = new THREE.Vector3(0.75, 1.6, 0);

  // 3D Aim Trajectory Visuals
  private trajectoryLine: THREE.Line;
  private trajectoryPointsCount = 50;
  private aimMarkerMesh: THREE.Mesh;

  // Active Projectile State
  public activeProjectileMesh: THREE.Mesh | null = null;
  public activeProjectileBody: CANNON.Body | null = null;
  public isBombProjectile: boolean = false;

  public originPos = new THREE.Vector3(0, 1.5, 10.0);

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld, materials: VaultMaterials) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.materials = materials;

    this.launcherGroup = new THREE.Group();
    this.launcherGroup.position.copy(this.originPos);
    this.scene.add(this.launcherGroup);

    // 1. Slingshot Elastic Bands
    const bandMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 6 });
    this.bandLeft = new THREE.Line(new THREE.BufferGeometry(), bandMat);
    this.bandRight = new THREE.Line(new THREE.BufferGeometry(), bandMat);
    this.launcherGroup.add(this.bandLeft);
    this.launcherGroup.add(this.bandRight);

    // 2. Leather Pouch Pocket
    const pouchGeom = new THREE.BoxGeometry(0.45, 0.35, 0.35);
    const pouchMat = new THREE.MeshStandardMaterial({ color: 0x884400, roughness: 0.6, metalness: 0.3 });
    this.pouchMesh = new THREE.Mesh(pouchGeom, pouchMat);
    this.launcherGroup.add(this.pouchMesh);

    // 3. Trajectory Dotted Aim Arc Line
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.trajectoryPointsCount * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trajectoryLine = new THREE.Line(geom, this.materials.laserTrajectory);
    this.trajectoryLine.computeLineDistances();
    this.scene.add(this.trajectoryLine);

    // 4. Aim Target Reticle Marker
    const markerGeom = new THREE.SphereGeometry(0.35, 16, 16);
    this.aimMarkerMesh = new THREE.Mesh(markerGeom, this.materials.aimMarker);
    this.scene.add(this.aimMarkerMesh);

    this.buildLauncherModel();
    this.updateSlingshotVisuals();
  }

  private buildLauncherModel(): void {
    // Heavy Industrial Steel Base Plate
    const baseGeom = new THREE.CylinderGeometry(1.4, 1.8, 0.5, 16);
    const baseMesh = new THREE.Mesh(baseGeom, this.materials.steel);
    baseMesh.position.set(0, -0.25, 0);
    this.launcherGroup.add(baseMesh);

    // Center Vertical Steel Column
    const columnGeom = new THREE.CylinderGeometry(0.35, 0.5, 1.4, 16);
    const columnMesh = new THREE.Mesh(columnGeom, this.materials.steel);
    columnMesh.position.set(0, 0.7, 0);
    this.launcherGroup.add(columnMesh);

    // Y-Fork Left & Right Slingshot Prongs
    const prongGeom = new THREE.CylinderGeometry(0.18, 0.24, 1.3, 16);
    
    const leftProng = new THREE.Mesh(prongGeom, this.materials.steel);
    leftProng.position.copy(this.leftProngPos);
    leftProng.rotation.z = 0.25;

    const rightProng = new THREE.Mesh(prongGeom, this.materials.steel);
    rightProng.position.copy(this.rightProngPos);
    rightProng.rotation.z = -0.25;

    this.launcherGroup.add(leftProng);
    this.launcherGroup.add(rightProng);

    // Glowing Neon Coils on Slingshot Prongs
    const ringGeom = new THREE.TorusGeometry(0.24, 0.06, 12, 24);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
    
    const ringLeft = new THREE.Mesh(ringGeom, ringMat);
    ringLeft.position.copy(this.leftProngPos);
    ringLeft.position.y += 0.45;

    const ringRight = new THREE.Mesh(ringGeom, ringMat);
    ringRight.position.copy(this.rightProngPos);
    ringRight.position.y += 0.45;

    this.launcherGroup.add(ringLeft);
    this.launcherGroup.add(ringRight);
  }

  public setAim(pitch: number, yaw: number, power: number): void {
    this.aimState.pitch = Math.max(0.05, Math.min(Math.PI / 2.6, pitch));
    this.aimState.yaw = Math.max(-Math.PI / 3.5, Math.min(Math.PI / 3.5, yaw));
    this.aimState.power = Math.max(0.2, Math.min(1.0, power));

    this.updateSlingshotVisuals();
    this.updateTrajectoryVisual();
  }

  public updateSlingshotVisuals(): void {
    // Pullback vector extending BACKWARDS toward camera (+z) based on tension power
    const pullDistance = 0.4 + this.aimState.power * 1.6;
    const pocketPos = new THREE.Vector3(
      -Math.sin(this.aimState.yaw) * pullDistance,
      1.5 - Math.sin(this.aimState.pitch) * pullDistance * 0.6,
      Math.cos(this.aimState.pitch) * Math.cos(this.aimState.yaw) * pullDistance
    );

    this.pouchMesh.position.copy(pocketPos);
    this.pouchMesh.rotation.y = this.aimState.yaw;
    this.pouchMesh.rotation.x = this.aimState.pitch;

    // Update Elastic Bands
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

  public getInitialVelocity(): THREE.Vector3 {
    const speed = 18 + Math.pow(this.aimState.power, 1.2) * 36; // Launch speed downfield (18 to 54 m/s)
    const vx = Math.sin(this.aimState.yaw) * Math.cos(this.aimState.pitch) * speed;
    const vy = Math.sin(this.aimState.pitch) * speed;
    const vz = -Math.cos(this.aimState.yaw) * Math.cos(this.aimState.pitch) * speed; // Downfield along -z!
    return new THREE.Vector3(vx, vy, vz);
  }

  public updateTrajectoryVisual(): void {
    const vel = this.getInitialVelocity();
    const positions = (this.trajectoryLine.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

    const gravity = 12.0;
    const dt = 0.045;

    let currX = this.originPos.x + this.pouchMesh.position.x;
    let currY = this.originPos.y + this.pouchMesh.position.y;
    let currZ = this.originPos.z + this.pouchMesh.position.z;

    let vx = vel.x;
    let vy = vel.y;
    let vz = vel.z;

    for (let i = 0; i < this.trajectoryPointsCount; i++) {
      positions[i * 3] = currX;
      positions[i * 3 + 1] = currY;
      positions[i * 3 + 2] = currZ;

      currX += vx * dt;
      currY += vy * dt;
      currZ += vz * dt;
      vy -= gravity * dt;
    }

    this.trajectoryLine.geometry.attributes.position.needsUpdate = true;
    this.trajectoryLine.computeLineDistances();
    this.aimMarkerMesh.position.set(currX, currY, currZ);
  }

  public setTrajectoryVisible(visible: boolean): void {
    this.bandLeft.visible = visible;
    this.bandRight.visible = visible;
    this.pouchMesh.visible = visible;
    this.trajectoryLine.visible = visible;
    this.aimMarkerMesh.visible = visible;
  }

  /**
   * Launch Projectile downfield into 3D Physics Space
   */
  public launch(isBomb: boolean = false): void {
    this.clearActiveProjectile();
    this.isBombProjectile = isBomb;

    const vel = this.getInitialVelocity();
    const radius = isBomb ? 0.55 : 0.42;
    const mat = isBomb ? this.materials.bombProjectile : this.materials.projectile;

    const geom = isBomb ? new THREE.SphereGeometry(radius, 20, 20) : new THREE.CylinderGeometry(radius * 0.7, radius, 1.3, 16);
    if (!isBomb) geom.rotateX(Math.PI / 2);
    
    this.activeProjectileMesh = new THREE.Mesh(geom, mat);
    this.activeProjectileMesh.position.copy(this.originPos);
    this.activeProjectileMesh.position.add(this.pouchMesh.position);
    this.scene.add(this.activeProjectileMesh);

    const shape = isBomb ? new CANNON.Sphere(radius) : new CANNON.Cylinder(radius * 0.7, radius, 1.3, 16);
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
