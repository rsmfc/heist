/**
 * Materials & Shaders for Vault Heist 3D Engine
 * Configures AAA PBR metallic, glass transmission, hazard, and emissive materials.
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
}

export function createVaultMaterials(): VaultMaterials {
  // 1. Concrete / Dark Carbon Beam
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x222630,
    roughness: 0.7,
    metalness: 0.3
  });

  // 2. Brushed Reinforced Steel
  const steel = new THREE.MeshStandardMaterial({
    color: 0x8a95a5,
    roughness: 0.25,
    metalness: 0.85
  });

  // 3. Security Glass (PBR Physical Transmission Material)
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xa0e0ff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.85,
    ior: 1.5
  });

  // 4. Gold Bullion Stack
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.15,
    metalness: 0.95,
    emissive: 0x443300,
    emissiveIntensity: 0.2
  });

  // 5. Diamond Hard Drive / High Value Safe
  const diamond = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x006699,
    emissiveIntensity: 0.4
  });

  // 6. Hazard TNT Explosive Barrel
  const tnt = new THREE.MeshStandardMaterial({
    color: 0xff3b00,
    roughness: 0.4,
    metalness: 0.2,
    emissive: 0x881100,
    emissiveIntensity: 0.3
  });

  // 7. Standard Thermal Drill Projectile
  const projectile = new THREE.MeshStandardMaterial({
    color: 0x334455,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x00aaee,
    emissiveIntensity: 0.3
  });

  // 8. Super Bomb Warhead Projectile
  const bombProjectile = new THREE.MeshStandardMaterial({
    color: 0xff2200,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0xff5500,
    emissiveIntensity: 0.6
  });

  // 9. Metallic Floor Grid
  const floor = new THREE.MeshStandardMaterial({
    color: 0x11141a,
    roughness: 0.6,
    metalness: 0.5
  });

  // 10. Trajectory Glowing Laser Arc Line
  const laserTrajectory = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    linewidth: 3,
    transparent: true,
    opacity: 0.85
  });

  // 11. Aim Point Marker
  const aimMarker = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
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
    aimMarker
  };
}
