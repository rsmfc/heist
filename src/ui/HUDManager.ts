/**
 * iGaming Casino HUD UI Controller for Vault Heist 3D
 * Handles betting controls, balance management, game modes, history, autoplay, and modals.
 */

import confetti from 'canvas-confetti';
import { GameScene } from '../engine/GameScene';
import { ProvablyFairEngine } from '../math/ProvablyFair';
import type { GameMode, RoundResult } from '../math/ProvablyFair';

export class HUDManager {
  private gameScene: GameScene;

  // State
  public balance: number = 1000.00;
  public currentBet: number = 1.00;
  public selectedMode: GameMode = 'standard';
  public isAutoplayActive: boolean = false;
  public history: number[] = [1.25, 0.00, 4.50, 18.20, 0.00, 2.10];

  // DOM Elements
  private balanceEl!: HTMLElement;
  private betInputEl!: HTMLInputElement;
  private currentMultEl!: HTMLElement;
  private payoutValEl!: HTMLElement;
  private fireBtn!: HTMLButtonElement;
  private modeStandardBtn!: HTMLButtonElement;
  private modeBombBtn!: HTMLButtonElement;
  private modeMaxBtn!: HTMLButtonElement;
  private historyContainerEl!: HTMLElement;
  private provablyFairModal!: HTMLElement;
  private paytableModal!: HTMLElement;

  constructor(gameScene: GameScene) {
    this.gameScene = gameScene;
    this.bindDOMElements();
    this.setupListeners();
    this.updateUI();

    // Wire Game Scene Callbacks
    this.gameScene.onMultiplierUpdate = (mult: number) => {
      this.currentMultEl.innerText = `${mult.toFixed(2)}x`;
      const payout = this.calculateBetCost() * mult;
      this.payoutValEl.innerText = `$${payout.toFixed(2)}`;
    };

    this.gameScene.onRoundComplete = (result: RoundResult, finalMult: number) => {
      this.handleRoundComplete(result, finalMult);
    };
  }

  private bindDOMElements(): void {
    this.balanceEl = document.getElementById('balance-val')!;
    this.betInputEl = document.getElementById('bet-input') as HTMLInputElement;
    this.currentMultEl = document.getElementById('current-multiplier')!;
    this.payoutValEl = document.getElementById('payout-value')!;
    this.fireBtn = document.getElementById('fire-btn') as HTMLButtonElement;

    this.modeStandardBtn = document.getElementById('mode-standard') as HTMLButtonElement;
    this.modeBombBtn = document.getElementById('mode-bomb') as HTMLButtonElement;
    this.modeMaxBtn = document.getElementById('mode-max') as HTMLButtonElement;

    this.historyContainerEl = document.getElementById('history-container')!;
    this.provablyFairModal = document.getElementById('pf-modal')!;
    this.paytableModal = document.getElementById('paytable-modal')!;
  }

  public calculateBetCost(): number {
    const base = Math.max(0.1, parseFloat(this.betInputEl.value) || 1.0);
    if (this.selectedMode === 'bomb') return base * 25;
    if (this.selectedMode === 'max_vault') return base * 100;
    return base;
  }

  private setupListeners(): void {
    // Mode Buttons
    this.modeStandardBtn.addEventListener('click', () => this.setGameMode('standard'));
    this.modeBombBtn.addEventListener('click', () => this.setGameMode('bomb'));
    this.modeMaxBtn.addEventListener('click', () => this.setGameMode('max_vault'));

    // Bet Adjustment Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = parseFloat((e.target as HTMLElement).getAttribute('data-val') || '1');
        this.betInputEl.value = val.toFixed(2);
        this.updateBetCostDisplay();
      });
    });

    document.getElementById('bet-half')?.addEventListener('click', () => {
      const cur = parseFloat(this.betInputEl.value) || 1.0;
      this.betInputEl.value = Math.max(0.1, cur / 2).toFixed(2);
      this.updateBetCostDisplay();
    });

    document.getElementById('bet-double')?.addEventListener('click', () => {
      const cur = parseFloat(this.betInputEl.value) || 1.0;
      this.betInputEl.value = Math.min(100, cur * 2).toFixed(2);
      this.updateBetCostDisplay();
    });

    document.getElementById('bet-max')?.addEventListener('click', () => {
      this.betInputEl.value = '100.00';
      this.updateBetCostDisplay();
    });

    // Fire Button
    this.fireBtn.addEventListener('click', () => this.triggerFire());

    // Audio & Modals
    document.getElementById('toggle-audio')?.addEventListener('click', () => {
      const isMuted = this.gameScene.soundEngine.toggleMute();
      document.getElementById('toggle-audio')!.innerText = isMuted ? '🔇 MUTE' : '🔊 AUDIO';
    });

    document.getElementById('toggle-music')?.addEventListener('click', () => {
      const isPlaying = this.gameScene.soundEngine.toggleMusic();
      document.getElementById('toggle-music')!.innerText = isPlaying ? '🎵 MUSIC ON' : '🎶 MUSIC OFF';
    });

    document.getElementById('open-pf-btn')?.addEventListener('click', () => this.openProvablyFairModal());
    document.getElementById('close-pf-btn')?.addEventListener('click', () => this.provablyFairModal.classList.add('hidden'));

    document.getElementById('open-paytable-btn')?.addEventListener('click', () => this.paytableModal.classList.remove('hidden'));
    document.getElementById('close-paytable-btn')?.addEventListener('click', () => this.paytableModal.classList.add('hidden'));

    // Client seed change in PF modal
    document.getElementById('save-client-seed-btn')?.addEventListener('click', () => {
      const input = (document.getElementById('client-seed-input') as HTMLInputElement).value;
      this.gameScene.provablyFair.setClientSeed(input);
      alert('Client seed updated successfully!');
    });

    // Verification Calculator
    document.getElementById('verify-calc-btn')?.addEventListener('click', () => {
      const sSeed = (document.getElementById('verify-server-seed') as HTMLInputElement).value;
      const cSeed = (document.getElementById('verify-client-seed') as HTMLInputElement).value;
      const nonce = parseInt((document.getElementById('verify-nonce') as HTMLInputElement).value || '1');
      const mode = (document.getElementById('verify-mode') as HTMLSelectElement).value as GameMode;

      const calcMult = ProvablyFairEngine.verifyRound(sSeed, cSeed, nonce, mode);
      (document.getElementById('verify-result') as HTMLElement).innerText = `Verified Outcome: ${calcMult.toFixed(2)}x`;
    });
  }

  public setGameMode(mode: GameMode): void {
    if (this.gameScene.isRoundInFlight) return;
    this.selectedMode = mode;

    this.modeStandardBtn.classList.toggle('active', mode === 'standard');
    this.modeBombBtn.classList.toggle('active', mode === 'bomb');
    this.modeMaxBtn.classList.toggle('active', mode === 'max_vault');

    this.gameScene.resetRound(mode);
    this.fireBtn.disabled = false;
    this.updateBetCostDisplay();
  }

  public updateBetCostDisplay(): void {
    const cost = this.calculateBetCost();
    const btnText = this.selectedMode === 'bomb'
      ? `BLAST BOMB ($${cost.toFixed(2)})`
      : this.selectedMode === 'max_vault'
      ? `MAX VAULT ($${cost.toFixed(2)})`
      : `BLAST VAULT ($${cost.toFixed(2)})`;

    this.fireBtn.innerText = btnText;
  }

  public triggerFire(): void {
    if (!this.gameScene.isAiming || this.gameScene.isRoundInFlight) return;

    const totalCost = this.calculateBetCost();
    if (this.balance < totalCost) {
      alert('Insufficient balance! Resetting balance to $1,000.00');
      this.balance = 1000.00;
      this.updateUI();
    }

    // Deduct Bet Cost
    this.balance -= totalCost;
    this.updateUI();

    const fired = this.gameScene.fireShot();
    if (fired) {
      this.fireBtn.disabled = true;
      this.fireBtn.innerText = 'FIRING...';
    } else {
      this.fireBtn.disabled = false;
      this.updateBetCostDisplay();
    }
  }

  private handleRoundComplete(_result: RoundResult, finalMult: number): void {
    const betCost = this.calculateBetCost();
    const payout = betCost * finalMult;

    if (payout > 0) {
      this.balance += payout;
    }

    this.history.unshift(finalMult);
    if (this.history.length > 10) this.history.pop();
    this.renderHistory();

    // Trigger Confetti for Big Wins
    if (finalMult >= 5) {
      confetti({
        particleCount: Math.min(200, Math.floor(finalMult * 10)),
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    this.updateUI();

    // Reset round and re-enable button cleanly
    setTimeout(() => {
      this.gameScene.resetRound(this.selectedMode);
      this.fireBtn.disabled = false;
      this.updateBetCostDisplay();
    }, 800);
  }

  private renderHistory(): void {
    this.historyContainerEl.innerHTML = '';
    this.history.forEach(mult => {
      const badge = document.createElement('div');
      badge.className = `history-badge ${mult >= 10 ? 'big' : mult > 0 ? 'win' : 'loss'}`;
      badge.innerText = `${mult.toFixed(2)}x`;
      this.historyContainerEl.appendChild(badge);
    });
  }

  public updateUI(): void {
    this.balanceEl.innerText = `$${this.balance.toFixed(2)}`;
    this.renderHistory();
    this.updateBetCostDisplay();
  }

  private openProvablyFairModal(): void {
    const pfState = this.gameScene.provablyFair.getState();
    (document.getElementById('pf-hash') as HTMLElement).innerText = pfState.serverSeedHash;
    (document.getElementById('client-seed-input') as HTMLInputElement).value = pfState.clientSeed;
    (document.getElementById('pf-nonce') as HTMLElement).innerText = pfState.nonce.toString();

    this.provablyFairModal.classList.remove('hidden');
  }
}
