/**
 * Interactive 3D Slingshot / Thermal Drill Launcher for Vault Heist
 * Manages 3D launcher model, elastic slingshot bands, drag/touch trajectory aiming, arc predictor, and projectile firing.
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
  public aimState: AimState = { pitch: 0.35, yaw: 0.0, power: 0.7 };
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private materials: VaultMaterials;

  // Slingshot Prongs & Bands
  private bandLeft: THREE.Line;
  private bandRight: THREE.Line;
  private leftProngPos = new THREE.Vector3(-0.1, 1.4, -0.6);
  private rightProngPos = new THREE.Vector3(-0.1, 1.4, 0.6);

  // Trajectory Visuals
  private trajectoryLine: THREE.Line;
  private trajectoryPointsCount = 50;
  private aimMarkerMesh: THREE.Mesh;

  // Active Projectile State
  public activeProjectileMesh: THREE.Mesh | null = null;
  public activeProjectileBody: CANNON.Body | null = null;
  public isBombProjectile: boolean = false;

  public originPos = new THREE.Vector3(-9.0, 1.8, 0);

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld, materials: VaultMaterials) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.materials = materials;

    this.launcherGroup = new THREE.Group();
    this.launcherGroup.position.copy(this.originPos);
    this.scene.add(this.launcherGroup);

    this.buildLauncherModel();

    // Slingshot Elastic Bands (Line geometry)
    const bandMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 4 });
    this.bandLeft = new THREE.Line(new THREE.BufferGeometry(), bandMat);
    this.bandRight = new THREE.Line(new THREE.BufferGeometry(), bandMat);
    this.launcherGroup.add(this.bandLeft);
    this.launcherGroup.add(this.bandRight);

    // Trajectory Line
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.trajectoryPointsCount * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trajectoryLine = new THREE.Line(geom, this.materials.laserTrajectory);
    this.scene.add(this.trajectoryLine);

    // Aim Target Marker
    const markerGeom = new THREE.SphereGeometry(0.25, 16, 16);
    this.aimMarkerMesh = new THREE.Mesh(markerGeom, this.materials.aimMarker);
    this.scene.add(this.aimMarkerMesh);

    this.updateTrajectoryVisual();
  }

  private buildLauncherModel(): void {
    // Heavy Industrial Base Mount
    const baseGeom = new THREE.CylinderGeometry(0.9, 1.2, 0.4, 16);
    const baseMesh = new THREE.Mesh(baseGeom, this.materials.steel);
    baseMesh.position.set(0, -0.2, 0);
    this.launcherGroup.add(baseMesh);

    // Vertical Slingshot Y-Fork Pillar
    const stemGeom = new THREE.BoxGeometry(0.35, 1.0, 0.35);
    const stemMesh = new THREE.Mesh(stemGeom, this.materials.concrete);
    stemMesh.position.set(0, 0.4, 0);
    this.launcherGroup.add(stemMesh);

    // Left & Right Slingshot Prongs
    const prongGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 12);
    const leftProng = new THREE.Mesh(prongGeom, this.materials.steel);
    leftProng.position.copy(this.leftProngPos);
    leftProng.rotation.z = -0.25;

    const rightProng = new THREE.Mesh(prongGeom, this.materials.steel);
    rightProng.position.copy(this.rightProngPos);
    rightProng.rotation.z = -0.25;

    this.launcherGroup.add(leftProng);
    this.launcherGroup.add(rightProng);

    // Barrel / Launcher Core
    const barrelGeom = new THREE.CylinderGeometry(0.35, 0.45, 1.6, 16);
    barrelGeom.rotateX(Math.PI / 2);
    const barrelMesh = new THREE.Mesh(barrelGeom, this.materials.projectile);
    barrelMesh.name = 'barrel';
    barrelMesh.position.set(0, 0.6, 0.4);
    this.launcherGroup.add(barrelMesh);
  }

  public setAim(pitch: number, yaw: number, power: number): void {
    this.aimState.pitch = Math.max(0.05, Math.min(Math.PI / 3, pitch));
    this.aimState.yaw = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, yaw));
    this.aimState.power = Math.max(0.2, Math.min(1.0, power));

    // Rotate Cannon Barrel
    const barrel = this.launcherGroup.getObjectByName('barrel');
    if (barrel) {
      barrel.rotation.x = -this.aimState.pitch;
      barrel.rotation.y = this.aimState.yaw;
    }

    this.updateSlingshotBands();
    this.updateTrajectoryVisual();
  }

  private updateSlingshotBands(): void {
    // Pullback displacement based on tension power & aim angle
    const pullDistance = 0.4 + this.aimState.power * 0.8;
    const pocketPos = new THREE.Vector3(
      -Math.cos(this.aimState.pitch) * Math.cos(this.aimState.yaw) * pullDistance,
      0.6 - Math.sin(this.aimState.pitch) * pullDistance,
      -Math.sin(this.aimState.yaw) * pullDistance
    );

    // Left Elastic Band
    const leftPositions = new Float32Array([
      this.leftProngPos.x, this.leftProngPos.y, this.leftProngPos.z,
      pocketPos.x, pocketPos.y, pocketPos.z
    ]);
    this.bandLeft.geometry.setAttribute('position', new THREE.BufferAttribute(leftPositions, 3));
    this.bandLeft.geometry.attributes.position.needsUpdate = true;

    // Right Elastic Band
    const rightPositions = new Float32Array([
      this.rightProngPos.x, this.rightProngPos.y, this.rightProngPos.z,
      pocketPos.x, pocketPos.y, pocketPos.z
    ]);
    this.bandRight.geometry.setAttribute('position', new THREE.BufferAttribute(rightPositions, 3));
    this.bandRight.geometry.attributes.position.needsUpdate = true;
  }

  public getInitialVelocity(): THREE.Vector3 {
    const speed = 22 + this.aimState.power * 26; // High velocity launch across field (22 to 48 m/s)
    const vx = Math.cos(this.aimState.pitch) * Math.cos(this.aimState.yaw) * speed;
    const vy = Math.sin(this.aimState.pitch) * speed;
    const vz = Math.sin(this.aimState.yaw) * speed;
    return new THREE.Vector3(vx, vy, vz);
  }

  public updateTrajectoryVisual(): void {
    const vel = this.getInitialVelocity();
    const positions = (this.trajectoryLine.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

    const gravity = 12.0;
    const dt = 0.045;

    let currX = this.originPos.x;
    let currY = this.originPos.y + 0.6;
    let currZ = this.originPos.z;

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
    this.aimMarkerMesh.position.set(currX, currY, currZ);
  }

  public setTrajectoryVisible(visible: boolean): void {
    this.trajectoryLine.visible = visible;
    this.aimMarkerMesh.visible = visible;
    this.bandLeft.visible = visible;
    this.bandRight.visible = visible;
  }

  /**
   * Launch Projectile into 3D Physics Space
   */
  public launch(isBomb: boolean = false): void {
    this.clearActiveProjectile();
    this.isBombProjectile = isBomb;

    const vel = this.getInitialVelocity();
    const radius = isBomb ? 0.45 : 0.35;
    const mat = isBomb ? this.materials.bombProjectile : this.materials.projectile;

    const geom = isBomb ? new THREE.SphereGeometry(radius, 16, 16) : new THREE.CylinderGeometry(radius * 0.7, radius, 1.2, 16);
    if (!isBomb) geom.rotateX(Math.PI / 2);
    
    this.activeProjectileMesh = new THREE.Mesh(geom, mat);
    this.activeProjectileMesh.position.copy(this.originPos);
    this.activeProjectileMesh.position.y += 0.6;
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
