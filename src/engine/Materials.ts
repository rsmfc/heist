/**
 * AAA Bright Bank Vault Materials for Vault Heist 3D Engine
 * Guaranteed high visibility, bright emissive accents, glossy reflections, and rich colors.
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
  laserTrajectory: THREE.LineDashedMaterial;
  aimMarker: THREE.MeshBasicMaterial;
  slingshotBand: THREE.LineBasicMaterial;
  goldDecal: THREE.MeshStandardMaterial;
  diamondCore: THREE.MeshBasicMaterial;
  wall: THREE.MeshStandardMaterial;
}

export function createVaultMaterials(): VaultMaterials {
  // 1. High-Contrast Slate Concrete
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.4,
    metalness: 0.4
  });

  // 2. Brushed Chrome Steel
  const steel = new THREE.MeshStandardMaterial({
    color: 0xc0caf5,
    roughness: 0.2,
    metalness: 0.85
  });

  // 3. Security Glass (Vibrant Translucent Cyan Crystal)
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x7dcfff,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.8,
    ior: 1.5,
    emissive: 0x004466,
    emissiveIntensity: 0.4
  });

  // 4. Brilliant Gold Bullion Stack
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.15,
    metalness: 0.9,
    emissive: 0x885500,
    emissiveIntensity: 0.45
  });

  // 5. High-Tech Cyan Diamond Safe
  const diamond = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    roughness: 0.1,
    metalness: 0.8,
    emissive: 0x0088cc,
    emissiveIntensity: 0.7
  });

  // 6. Hazard Red TNT Barrel
  const tnt = new THREE.MeshStandardMaterial({
    color: 0xff2233,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0xaa0011,
    emissiveIntensity: 0.5
  });

  // 7. Thermal Drill Rocket Projectile
  const projectile = new THREE.MeshStandardMaterial({
    color: 0x3b4252,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x00aaff,
    emissiveIntensity: 0.6
  });

  // 8. Glowing Magma Super Bomb
  const bombProjectile = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0xff7700,
    emissiveIntensity: 0.9
  });

  // 9. Metallic Floor Grid
  const floor = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.7
  });

  // 10. Trajectory Dotted Laser Arc
  const laserTrajectory = new THREE.LineDashedMaterial({
    color: 0x00ffff,
    dashSize: 0.3,
    gapSize: 0.2,
    linewidth: 3
  });

  // 11. Glowing Aim Target Marker
  const aimMarker = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.85
  });

  // 12. Slingshot Band (Glowing Cyan Line)
  const slingshotBand = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    linewidth: 5
  });

  // 13. Gold Trim
  const goldDecal = new THREE.MeshStandardMaterial({
    color: 0xffea00,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x554400,
    emissiveIntensity: 0.3
  });

  // 14. Diamond Inner Gem Core
  const diamondCore = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95
  });

  // 15. Bank Vault Room Wall
  const wall = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.6
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
    diamondCore,
    wall
  };
}
