/**
 * Cannon-es 3D Physics World Wrapper for Vault Heist
 * Manages rigid bodies, collision impulse solvers, contact materials, and explosion force fields.
 */

import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class PhysicsWorld {
  public world: CANNON.World;
  private defaultMaterial: CANNON.Material;
  private glassMaterial: CANNON.Material;
  private metalMaterial: CANNON.Material;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -12, 0); // Crisp arcade gravity
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 10;

    // Contact Materials Configuration
    this.defaultMaterial = new CANNON.Material('default');
    this.glassMaterial = new CANNON.Material('glass');
    this.metalMaterial = new CANNON.Material('metal');

    const defaultContact = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.4,
        restitution: 0.3
      }
    );

    const metalContact = new CANNON.ContactMaterial(
      this.metalMaterial,
      this.metalMaterial,
      {
        friction: 0.2,
        restitution: 0.5
      }
    );

    const glassContact = new CANNON.ContactMaterial(
      this.glassMaterial,
      this.defaultMaterial,
      {
        friction: 0.1,
        restitution: 0.6
      }
    );

    this.world.addContactMaterial(defaultContact);
    this.world.addContactMaterial(metalContact);
    this.world.addContactMaterial(glassContact);
  }

  public step(dt: number): void {
    // Fixed timestep of 1/60s for deterministic physics simulation
    this.world.step(1 / 60, dt, 3);
  }

  public createGround(): CANNON.Body {
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0, // Static plane
      material: this.defaultMaterial
    });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
    return groundBody;
  }

  /**
   * Applies 3D Radial Shockwave Impulse for TNT Explosions
   */
  public applyExplosionImpulse(epicenter: THREE.Vector3, radius: number = 8, force: number = 45): CANNON.Body[] {
    const affectedBodies: CANNON.Body[] = [];
    const centerPos = new CANNON.Vec3(epicenter.x, epicenter.y, epicenter.z);

    this.world.bodies.forEach(body => {
      if (body.mass === 0) return; // Skip static floor

      const dist = body.position.distanceTo(centerPos);
      if (dist <= radius) {
        affectedBodies.push(body);
        const impulseDir = body.position.vsub(centerPos);
        impulseDir.normalize();

        // Falloff force by distance
        const strength = force * (1 - dist / radius);
        const impulse = impulseDir.scale(strength);

        // Add upward lift for explosive spectacle
        impulse.y += strength * 0.4;

        body.wakeUp();
        body.applyImpulse(impulse, body.position);
      }
    });

    return affectedBodies;
  }
}
