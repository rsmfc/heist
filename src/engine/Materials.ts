/**
 * Vibrant AAA PBR Materials for Vault Heist 3D Engine
 * High contrast, glossy reflections, emissive neon highlights, and crisp visibility.
 */

import * as THREE from 'three';

export interface VaultMaterials {
  concrete: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshStandardMaterial;
  diamond: THREE.MeshStandardMaterial;
  tnt: THREE.MeshStandardMaterial;
  projectile: THREE.MeshStandardMaterial;
  bombProjectile: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  laserTrajectory: THREE.LineBasicMaterial;
  aimMarker: THREE.MeshBasicMaterial;
  slingshotBand: THREE.LineBasicMaterial;
  goldDecal: THREE.MeshStandardMaterial;
  diamondCore: THREE.MeshBasicMaterial;
}

export function createVaultMaterials(): VaultMaterials {
  // 1. High-Contrast Concrete (Bright Slate Blue-Grey)
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x434c5e,
    roughness: 0.5,
    metalness: 0.3
  });

  // 2. Polished Chrome Steel
  const steel = new THREE.MeshStandardMaterial({
    color: 0xe5e9f0,
    roughness: 0.15,
    metalness: 0.95
  });

  // 3. Crystal Security Glass (Vibrant Translucent Cyan)
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x88c0d0,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.2,
    transmission: 0.75,
    ior: 1.5,
    emissive: 0x003344,
    emissiveIntensity: 0.25
  });

  // 4. Brilliant Gold Bullion
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.12,
    metalness: 0.98,
    emissive: 0x664400,
    emissiveIntensity: 0.3
  });

  // 5. Glowing Quantum Diamond Safe
  const diamond = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x0088cc,
    emissiveIntensity: 0.6
  });

  // 6. Hazard TNT Barrel (Vibrant Red & Orange)
  const tnt = new THREE.MeshStandardMaterial({
    color: 0xff1100,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0x880000,
    emissiveIntensity: 0.4
  });

  // 7. Carbon Drill Rocket Projectile
  const projectile = new THREE.MeshStandardMaterial({
    color: 0x2e3440,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x0088ff,
    emissiveIntensity: 0.4
  });

  // 8. Glowing Magma Super Bomb Projectile
  const bombProjectile = new THREE.MeshStandardMaterial({
    color: 0xff3300,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0xff6600,
    emissiveIntensity: 0.8
  });

  // 9. Cyberpunk Reflective Floor Tiles
  const floor = new THREE.MeshStandardMaterial({
    color: 0x181e2a,
    roughness: 0.3,
    metalness: 0.6
  });

  // 10. Trajectory Arc Line
  const laserTrajectory = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    linewidth: 3,
    transparent: true,
    opacity: 0.85
  });

  // 11. Aim Marker
  const aimMarker = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.9
  });

  // 12. Slingshot Band (Glowing Cyan)
  const slingshotBand = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    linewidth: 6
  });

  // 13. Gold Decal / Gold Trim
  const goldDecal = new THREE.MeshStandardMaterial({
    color: 0xffea00,
    metalness: 1.0,
    roughness: 0.05
  });

  // 14. Diamond Inner Core
  const diamondCore = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
  });

  return {
    concrete,
    steel,
    glass,
    gold,
    diamond,
    tnt,
    projectile,
    bombProjectile,
    floor,
    laserTrajectory,
    aimMarker,
    slingshotBand,
    goldDecal,
    diamondCore
  };
}
