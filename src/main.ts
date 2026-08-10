/**
 * Application Entry Point for Vault Heist 3D
 */

import { GameScene } from './engine/GameScene';
import { HUDManager } from './ui/HUDManager';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Failed to locate #game-canvas element');
    return;
  }

  // 1. Initialize WebGL 3D Game Scene
  const gameScene = new GameScene(canvas);

  // 2. Initialize Casino HUD Manager
  const hudManager = new HUDManager(gameScene);
  (window as unknown as { hudManager: HUDManager }).hudManager = hudManager;

  console.log('🔒 Vault Heist 3D Engine & HUD Initialized Successfully');
});
