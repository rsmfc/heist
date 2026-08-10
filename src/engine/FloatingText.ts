/**
 * 3D World-Space Floating Multiplier Text Renderer for Vault Heist
 * Displays pop-up payout numbers (+0.5x, +5.0x, +25.0x) over destroyed targets.
 */

import * as THREE from 'three';

interface FloatingItem {
  element: HTMLDivElement;
  position: THREE.Vector3;
  life: number;
  maxLife: number;
  value: number;
}

export class FloatingTextManager {
  private container: HTMLDivElement;
  private camera: THREE.PerspectiveCamera;
  private items: FloatingItem[] = [];

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.container = document.createElement('div');
    this.container.id = 'floating-text-container';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.overflow = 'hidden';
    this.container.style.zIndex = '10';
    document.body.appendChild(this.container);
  }

  public spawnText(pos: THREE.Vector3, multiplier: number, isSpecial: boolean = false): void {
    const el = document.createElement('div');
    el.className = `floating-multiplier-text ${multiplier >= 5 ? 'big-multiplier' : ''} ${isSpecial ? 'special-multiplier' : ''}`;
    el.innerText = `+${multiplier.toFixed(2)}x`;
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.fontFamily = "'Outfit', 'Inter', sans-serif";
    el.style.fontWeight = '900';
    el.style.fontSize = multiplier >= 10 ? '28px' : multiplier >= 2 ? '22px' : '16px';
    el.style.color = multiplier >= 10 ? '#00ffff' : multiplier >= 2 ? '#ffd700' : '#ffffff';
    el.style.textShadow = multiplier >= 5 ? '0 0 12px rgba(255,215,0,0.8), 0 0 24px rgba(0,255,255,0.6)' : '0 2px 6px rgba(0,0,0,0.8)';
    el.style.transition = 'opacity 0.2s ease-out';
    el.style.opacity = '1';

    this.container.appendChild(el);

    this.items.push({
      element: el,
      position: pos.clone(),
      life: 0,
      maxLife: 1.2,
      value: multiplier
    });
  }

  public update(dt: number): void {
    const tempV = new THREE.Vector3();
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life += dt;

      if (item.life >= item.maxLife) {
        this.container.removeChild(item.element);
        this.items.splice(i, 1);
        continue;
      }

      // Float upwards in world space
      item.position.y += dt * 1.5;

      // Project 3D vector to 2D screen coordinates
      tempV.copy(item.position);
      tempV.project(this.camera);

      const x = tempV.x * halfWidth + halfWidth;
      const y = -tempV.y * halfHeight + halfHeight;

      const progress = item.life / item.maxLife;
      const opacity = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;

      item.element.style.left = `${x}px`;
      item.element.style.top = `${y}px`;
      item.element.style.opacity = opacity.toString();
    }
  }
}
