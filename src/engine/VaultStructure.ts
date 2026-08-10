/**
 * Destructible 3D Vault Tower Builder for Vault Heist
 * Procedurally generates rigid body towers comprised of Concrete, Glass, Steel, Gold, Safes, and TNT.
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { VaultMaterials } from './Materials';
import { PhysicsWorld } from './PhysicsWorld';
import type { GameMode } from '../math/ProvablyFair';

export type BlockType = 'concrete' | 'steel' | 'glass' | 'gold' | 'diamond' | 'tnt';

export interface VaultBlock {
  id: string;
  type: BlockType;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  health: number;
  maxHealth: number;
  multiplierValue: number;
  isDestroyed: boolean;
}

export class VaultStructureManager {
  public blocks: VaultBlock[] = [];
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private materials: VaultMaterials;
  private blockIdCounter = 0;

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld, materials: VaultMaterials) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.materials = materials;
  }

  public clear(): void {
    this.blocks.forEach(b => {
      this.scene.remove(b.mesh);
      this.physicsWorld.world.removeBody(b.body);
    });
    this.blocks = [];
  }

  /**
   * Builds target structure customized by Game Mode
   */
  public buildVaultStructure(mode: GameMode, _targetHitCount: number = 5): void {
    this.clear();

    const startX = 6.5;
    const startZ = 0;
    
    // Grid Dimensions
    const levels = mode === 'max_vault' ? 6 : mode === 'bomb' ? 5 : 4;
    const cols = mode === 'max_vault' ? 4 : 3;

    for (let level = 0; level < levels; level++) {
      const y = level * 1.05 + 0.55;

      for (let c = 0; c < cols; c++) {
        const x = startX + c * 1.1;
        const z = startZ + (Math.random() - 0.5) * 0.4;

        // Determine block type based on mode & height
        let type: BlockType = 'concrete';

        const rand = Math.random();
        if (mode === 'max_vault') {
          if (rand > 0.75) type = 'diamond';
          else if (rand > 0.5) type = 'gold';
          else if (rand > 0.35) type = 'tnt';
          else if (rand > 0.2) type = 'steel';
          else type = 'glass';
        } else if (mode === 'bomb') {
          if (rand > 0.8) type = 'tnt';
          else if (rand > 0.6) type = 'gold';
          else if (rand > 0.4) type = 'steel';
          else if (rand > 0.2) type = 'glass';
          else type = 'concrete';
        } else {
          // Standard Mode
          if (rand > 0.85) type = 'gold';
          else if (rand > 0.65) type = 'steel';
          else if (rand > 0.4) type = 'glass';
          else type = 'concrete';
        }

        // Guarantee at least one TNT in bomb/max mode
        if (level === 2 && c === 1 && (mode === 'bomb' || mode === 'max_vault')) {
          type = 'tnt';
        }

        this.spawnBlock(type, new THREE.Vector3(x, y, z));
      }
    }

    // Add extra capstone high-value vault on top
    if (mode === 'max_vault') {
      this.spawnBlock('diamond', new THREE.Vector3(startX + 1.6, levels * 1.05 + 0.6, 0));
    }
  }

  private spawnBlock(type: BlockType, pos: THREE.Vector3): VaultBlock {
    const id = `block_${++this.blockIdCounter}`;

    let size = new THREE.Vector3(1.0, 1.0, 1.0);
    let mass = 3.0;
    let mat = this.materials.concrete;
    let health = 2;
    let multiplierValue = 0.0; // Default zero multiplier for structural blocks

    switch (type) {
      case 'glass':
        mat = this.materials.glass;
        mass = 0.8;
        health = 1;
        multiplierValue = 0.0; // Glass breaks visually with 0 payout
        break;
      case 'steel':
        mat = this.materials.steel;
        mass = 5.0;
        health = 3;
        multiplierValue = 0.0;
        break;
      case 'gold':
        mat = this.materials.gold;
        size = new THREE.Vector3(0.9, 0.7, 0.9);
        mass = 3.5;
        health = 1;
        multiplierValue = 1.0; // Treasure collectible awards multiplier
        break;
      case 'diamond':
        mat = this.materials.diamond;
        size = new THREE.Vector3(0.85, 0.85, 0.85);
        mass = 4.0;
        health = 2;
        multiplierValue = 5.0; // High value vault collectible
        break;
      case 'tnt':
        mat = this.materials.tnt;
        size = new THREE.Vector3(0.9, 1.1, 0.9);
        mass = 1.5;
        health = 1;
        multiplierValue = 0.0; // TNT triggers blast wave
        break;
      default: // Concrete
        mat = this.materials.concrete;
        mass = 3.0;
        health = 2;
        multiplierValue = 0.0;
        break;
    }

    // 1. Create Three.js Mesh
    const geom = type === 'tnt' ? new THREE.CylinderGeometry(size.x / 2, size.x / 2, size.y, 16) : new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // 2. Create Cannon-es Physics Body
    const shape = type === 'tnt'
      ? new CANNON.Cylinder(size.x / 2, size.x / 2, size.y, 16)
      : new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));

    const body = new CANNON.Body({
      mass,
      position: new CANNON.Vec3(pos.x, pos.y, pos.z)
    });
    body.addShape(shape);
    this.physicsWorld.world.addBody(body);

    const block: VaultBlock = {
      id,
      type,
      mesh,
      body,
      health,
      maxHealth: health,
      multiplierValue,
      isDestroyed: false
    };

    this.blocks.push(block);
    return block;
  }

  public update(): void {
    this.blocks.forEach(b => {
      if (!b.isDestroyed) {
        b.mesh.position.copy(b.body.position as unknown as THREE.Vector3);
        b.mesh.quaternion.copy(b.body.quaternion as unknown as THREE.Quaternion);
      }
    });
  }
}
