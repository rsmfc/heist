/**
 * Destructible 3D Vault Tower Builder for Vault Heist
 * Builds highly detailed, visually distinct 3D blocks with bevels, trims, and high contrast.
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
  mesh: THREE.Group; // Group containing detailed sub-meshes (block + trims + decals)
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
      const y = level * 1.1 + 0.6;

      for (let c = 0; c < cols; c++) {
        const x = startX + c * 1.15;
        const z = startZ + (Math.random() - 0.5) * 0.4;

        let type: BlockType = 'concrete';

        const rand = Math.random();
        if (mode === 'max_vault') {
          if (rand > 0.72) type = 'diamond';
          else if (rand > 0.48) type = 'gold';
          else if (rand > 0.32) type = 'tnt';
          else if (rand > 0.18) type = 'steel';
          else type = 'glass';
        } else if (mode === 'bomb') {
          if (rand > 0.78) type = 'tnt';
          else if (rand > 0.55) type = 'gold';
          else if (rand > 0.35) type = 'steel';
          else if (rand > 0.18) type = 'glass';
          else type = 'concrete';
        } else {
          // Standard Mode
          if (rand > 0.82) type = 'gold';
          else if (rand > 0.62) type = 'steel';
          else if (rand > 0.38) type = 'glass';
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
      this.spawnBlock('diamond', new THREE.Vector3(startX + 1.7, levels * 1.1 + 0.6, 0));
    }
  }

  private spawnBlock(type: BlockType, pos: THREE.Vector3): VaultBlock {
    const id = `block_${++this.blockIdCounter}`;

    const blockGroup = new THREE.Group();
    blockGroup.position.copy(pos);

    let size = new THREE.Vector3(1.0, 1.0, 1.0);
    let mass = 3.0;
    let health = 2;
    let multiplierValue = 0.0;

    switch (type) {
      case 'concrete': {
        mass = 3.5;
        health = 2;
        multiplierValue = 0.0;

        // Base Concrete Block
        const geom = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        const mainMesh = new THREE.Mesh(geom, this.materials.concrete);
        mainMesh.castShadow = true;
        mainMesh.receiveShadow = true;
        blockGroup.add(mainMesh);

        // Steel Bevel Edges
        const edgeGeom = new THREE.BoxGeometry(1.04, 0.08, 1.04);
        const topEdge = new THREE.Mesh(edgeGeom, this.materials.steel);
        topEdge.position.y = 0.46;
        const botEdge = new THREE.Mesh(edgeGeom, this.materials.steel);
        botEdge.position.y = -0.46;
        blockGroup.add(topEdge);
        blockGroup.add(botEdge);
        break;
      }

      case 'steel': {
        mass = 5.5;
        health = 3;
        multiplierValue = 0.0;

        // Brushed Steel Pillar
        const geom = new THREE.BoxGeometry(0.95, 1.0, 0.95);
        const mainMesh = new THREE.Mesh(geom, this.materials.steel);
        mainMesh.castShadow = true;
        mainMesh.receiveShadow = true;
        blockGroup.add(mainMesh);

        // Dark Cross-Brace Grid
        const braceGeom = new THREE.BoxGeometry(0.98, 0.12, 0.98);
        const midBrace = new THREE.Mesh(braceGeom, this.materials.concrete);
        blockGroup.add(midBrace);
        break;
      }

      case 'glass': {
        mass = 0.8;
        health = 1;
        multiplierValue = 0.0;

        // Crystal Glass Pane
        const geom = new THREE.BoxGeometry(0.95, 1.0, 0.95);
        const mainMesh = new THREE.Mesh(geom, this.materials.glass);
        mainMesh.castShadow = true;
        blockGroup.add(mainMesh);

        // White Specular Frame
        const frameGeom = new THREE.BoxGeometry(0.98, 0.98, 0.98);
        const frameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
        const frameMesh = new THREE.Mesh(frameGeom, frameMat);
        blockGroup.add(frameMesh);
        break;
      }

      case 'gold': {
        size = new THREE.Vector3(0.9, 0.75, 0.9);
        mass = 3.5;
        health = 1;
        multiplierValue = 1.0;

        // Shiny Gold Block
        const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mainMesh = new THREE.Mesh(geom, this.materials.gold);
        mainMesh.castShadow = true;
        blockGroup.add(mainMesh);

        // Gold Bullion Bar Trims
        const barGeom = new THREE.BoxGeometry(size.x * 0.8, 0.15, size.z * 0.8);
        const barMesh = new THREE.Mesh(barGeom, this.materials.goldDecal);
        barMesh.position.y = size.y / 2 + 0.05;
        blockGroup.add(barMesh);
        break;
      }

      case 'diamond': {
        size = new THREE.Vector3(0.85, 0.85, 0.85);
        mass = 4.0;
        health = 2;
        multiplierValue = 5.0;

        // Cyan Diamond Vault Box
        const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mainMesh = new THREE.Mesh(geom, this.materials.diamond);
        mainMesh.castShadow = true;
        blockGroup.add(mainMesh);

        // Glowing Inner Core
        const coreGeom = new THREE.OctahedronGeometry(0.28, 0);
        const coreMesh = new THREE.Mesh(coreGeom, this.materials.diamondCore);
        blockGroup.add(coreMesh);
        break;
      }

      case 'tnt': {
        size = new THREE.Vector3(0.9, 1.15, 0.9);
        mass = 1.5;
        health = 1;
        multiplierValue = 0.0;

        // Hazard Red Cylinder
        const geom = new THREE.CylinderGeometry(size.x / 2, size.x / 2, size.y, 16);
        const mainMesh = new THREE.Mesh(geom, this.materials.tnt);
        mainMesh.castShadow = true;
        blockGroup.add(mainMesh);

        // Yellow Danger Stripes
        const stripeGeom = new THREE.CylinderGeometry(size.x / 2 + 0.02, size.x / 2 + 0.02, 0.18, 16);
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.3 });
        const stripeTop = new THREE.Mesh(stripeGeom, stripeMat);
        stripeTop.position.y = 0.3;
        const stripeBot = new THREE.Mesh(stripeGeom, stripeMat);
        stripeBot.position.y = -0.3;
        blockGroup.add(stripeTop);
        blockGroup.add(stripeBot);

        // Yellow Fuse Top
        const fuseGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
        const fuseMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const fuseMesh = new THREE.Mesh(fuseGeom, fuseMat);
        fuseMesh.position.y = size.y / 2 + 0.1;
        blockGroup.add(fuseMesh);
        break;
      }
    }

    this.scene.add(blockGroup);

    // Create Cannon-es Physics Body
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
      mesh: blockGroup,
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
