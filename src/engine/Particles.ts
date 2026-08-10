/**
 * GPU Particle System Manager for Vault Heist 3D Engine
 * Renders glass shards, gold explosions, sparks, smoke trails, and TNT shockwaves.
 */

import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  maxLife: number;
  life: number;
  rotSpeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private instancedMesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  private scene: THREE.Scene;
  private maxParticles = 500;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initInstancedMesh();
  }

  private initInstancedMesh(): void {
    // Shared cube geometry for all debris & particle shards
    const geom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9
    });

    this.instancedMesh = new THREE.InstancedMesh(geom, mat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.count = 0;
    this.scene.add(this.instancedMesh);
  }

  /**
   * Spawn Gold Coin / Bullion Burst Particles
   */
  public spawnGoldExplosion(pos: THREE.Vector3, count: number = 30): void {
    const goldColor = new THREE.Color(0xffd700);
    for (let i = 0; i < count; i++) {
      this.addParticle({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 7 + 2,
          (Math.random() - 0.5) * 8
        ),
        color: goldColor,
        size: Math.random() * 0.15 + 0.08,
        maxLife: 0.8 + Math.random() * 0.4,
        life: 0,
        rotSpeed: (Math.random() - 0.5) * 10
      });
    }
  }

  /**
   * Spawn Security Glass Shards
   */
  public spawnGlassShards(pos: THREE.Vector3, count: number = 25): void {
    const glassColor = new THREE.Color(0xa0e0ff);
    for (let i = 0; i < count; i++) {
      this.addParticle({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 5 + 1,
          (Math.random() - 0.5) * 6
        ),
        color: glassColor,
        size: Math.random() * 0.1 + 0.04,
        maxLife: 0.6 + Math.random() * 0.3,
        life: 0,
        rotSpeed: (Math.random() - 0.5) * 15
      });
    }
  }

  /**
   * Spawn Fiery TNT Explosion Shockwave & Sparks
   */
  public spawnExplosion(pos: THREE.Vector3, count: number = 60): void {
    for (let i = 0; i < count; i++) {
      const isFire = Math.random() > 0.3;
      const color = isFire ? new THREE.Color(0xff3300) : new THREE.Color(0xffaa00);
      this.addParticle({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          Math.random() * 12 + 2,
          (Math.random() - 0.5) * 14
        ),
        color,
        size: Math.random() * 0.25 + 0.1,
        maxLife: 1.0 + Math.random() * 0.5,
        life: 0,
        rotSpeed: (Math.random() - 0.5) * 20
      });
    }
  }

  /**
   * Rocket Exhaust Smoke/Flame Trail
   */
  public spawnRocketExhaust(pos: THREE.Vector3): void {
    const flameColor = new THREE.Color(Math.random() > 0.5 ? 0xff4400 : 0x00ccff);
    this.addParticle({
      position: pos.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      ),
      color: flameColor,
      size: 0.15,
      maxLife: 0.3,
      life: 0,
      rotSpeed: 0
    });
  }

  private addParticle(p: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(p);
    }
  }

  public update(dt: number): void {
    if (!this.instancedMesh) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration (velocity + gravity)
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 9.8 * dt; // Gravity

      // Fade size & rotation
      const progress = p.life / p.maxLife;
      const currentScale = p.size * (1 - progress);

      this.dummy.position.copy(p.position);
      this.dummy.scale.set(currentScale, currentScale, currentScale);
      this.dummy.rotation.x += p.rotSpeed * dt;
      this.dummy.rotation.y += p.rotSpeed * dt;
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, p.color);
    }

    this.instancedMesh.count = this.particles.length;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }
}
