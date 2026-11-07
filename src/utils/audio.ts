// Cozy ambient sound generator using Web Audio API

class SoundManager {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentType: string = 'none';
  private gainNode: GainNode | null = null;
  private intervalId: any = null;

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playAmbience(type: 'coffee' | 'park' | 'night' | 'creativity' | 'fire' | 'upbeat' = 'fire') {
    try {
      this.initContext();
      if (!this.ctx) return;

      this.stop();

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      this.isPlaying = true;
      this.currentType = type;

      if (type === 'fire') {
        this.createCampfireSound();
      } else if (type === 'coffee') {
        this.createCoffeeAmbience();
      } else if (type === 'park') {
        this.createNatureAmbience();
      } else {
        this.createGentleDrones();
      }
    } catch (e) {
      console.warn('Audio playback not allowed or failed:', e);
    }
  }

  private createCampfireSound() {
    if (!this.ctx || !this.gainNode) return;

    // Pink noise buffer for gentle low hum of fire
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.05;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();

    // Occasional subtle wood crackles
    this.intervalId = setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;
      if (Math.random() > 0.4) {
        const osc = this.ctx.createOscillator();
        const crackleGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300 + Math.random() * 800, this.ctx.currentTime);
        crackleGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);

        osc.connect(crackleGain);
        crackleGain.connect(this.gainNode);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.09);
      }
    }, 350);
  }

  private createCoffeeAmbience() {
    if (!this.ctx || !this.gainNode) return;
    // Warm harmonic soft chord
    const freqs = [220, 277.18, 329.63]; // A major cozy
    freqs.forEach((freq) => {
      if (!this.ctx || !this.gainNode) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(0.02, this.ctx.currentTime);
      osc.connect(g);
      g.connect(this.gainNode);
      osc.start();
    });
  }

  private createNatureAmbience() {
    if (!this.ctx || !this.gainNode) return;
    // Gentle high wind & occasional soft chime
    const freqs = [392, 587.33, 783.99]; // G chord
    freqs.forEach((freq) => {
      if (!this.ctx || !this.gainNode) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(0.015, this.ctx.currentTime);
      osc.connect(g);
      g.connect(this.gainNode);
      osc.start();
    });
  }

  private createGentleDrones() {
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(196, this.ctx.currentTime);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.03, this.ctx.currentTime);
    osc.connect(g);
    g.connect(this.gainNode);
    osc.start();
  }

  public playChime() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {
      // Audio not permitted yet
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.2);
      } catch {
        // ignore
      }
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const soundManager = new SoundManager();
