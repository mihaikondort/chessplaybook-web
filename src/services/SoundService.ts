/**
 * Sound Service — chess move sounds using Web Audio API.
 *
 * Generates short synthesized tones for move events. No external audio files
 * needed, so sounds load instantly without network requests.
 *
 * Sounds:
 *  - move:    soft click (wood-on-wood)
 *  - capture: sharper percussive hit
 *  - check:   short alert tone
 *  - castle:  double click (two rapid taps)
 *  - gameEnd: resolved chord (win) or low tone (loss/draw)
 *
 * All sounds respect the user's "sound enabled" preference stored in localStorage.
 */

const STORAGE_KEY = 'chessplaybook_sounds_enabled';

class SoundService {
  private ctx: AudioContext | null = null;
  private _enabled: boolean;

  constructor() {
    this._enabled = this.loadPreference();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(value: boolean): void {
    this._enabled = value;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
  }

  toggleEnabled(): boolean {
    this.setEnabled(!this._enabled);
    return this._enabled;
  }

  // -- Sound triggers -------------------------------------------------------

  move(): void {
    if (!this._enabled) return;
    this.playTone({ freq: 400, duration: 0.08, type: 'sine', gain: 0.3 });
  }

  capture(): void {
    if (!this._enabled) return;
    this.playNoise({ duration: 0.1, gain: 0.35 });
  }

  check(): void {
    if (!this._enabled) return;
    // Two-tone alert
    this.playTone({ freq: 660, duration: 0.08, type: 'square', gain: 0.15, delay: 0 });
    this.playTone({ freq: 880, duration: 0.12, type: 'square', gain: 0.15, delay: 0.1 });
  }

  castle(): void {
    if (!this._enabled) return;
    this.playTone({ freq: 400, duration: 0.06, type: 'sine', gain: 0.3, delay: 0 });
    this.playTone({ freq: 400, duration: 0.06, type: 'sine', gain: 0.3, delay: 0.12 });
  }

  gameEnd(type: 'win' | 'loss' | 'draw'): void {
    if (!this._enabled) return;
    if (type === 'win') {
      // Rising chord
      this.playTone({ freq: 523, duration: 0.15, type: 'sine', gain: 0.2, delay: 0 });
      this.playTone({ freq: 659, duration: 0.15, type: 'sine', gain: 0.2, delay: 0.12 });
      this.playTone({ freq: 784, duration: 0.25, type: 'sine', gain: 0.25, delay: 0.24 });
    } else if (type === 'loss') {
      // Descending
      this.playTone({ freq: 330, duration: 0.2, type: 'sine', gain: 0.2, delay: 0 });
      this.playTone({ freq: 262, duration: 0.3, type: 'sine', gain: 0.2, delay: 0.2 });
    } else {
      // Neutral
      this.playTone({ freq: 440, duration: 0.3, type: 'triangle', gain: 0.15 });
    }
  }

  // -- Internals ------------------------------------------------------------

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    // Resume if suspended (browsers require user interaction first)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(opts: {
    freq: number;
    duration: number;
    type: OscillatorType;
    gain: number;
    delay?: number;
  }): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = opts.type;
      osc.frequency.value = opts.freq;

      const startTime = ctx.currentTime + (opts.delay ?? 0);
      const endTime = startTime + opts.duration;

      gainNode.gain.setValueAtTime(opts.gain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(endTime + 0.05);
    } catch { /* AudioContext not available */ }
  }

  private playNoise(opts: { duration: number; gain: number }): void {
    try {
      const ctx = this.getContext();
      const bufferSize = Math.floor(ctx.sampleRate * opts.duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = opts.gain;

      // High-pass filter to make it sound more like a knock
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 800;

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
    } catch { /* AudioContext not available */ }
  }

  private loadPreference(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? JSON.parse(stored) : true; // enabled by default
    } catch {
      return true;
    }
  }
}

export const soundService = new SoundService();
