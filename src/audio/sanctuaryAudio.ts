/**
 * Procedural Web Audio synthesizer for the Yeongcheon Bugan-myeon Dolhalmae sanctuary.
 * Generates mountain wind, rustling pine needles, distant moktak/chimes,
 * and heavy granite-on-stone contact sounds without external audio files.
 */

export class SanctuaryAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private pineGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = false;
  private ambientIntervalId: number | null = null;
  private disposed = false;

  private ensureContext(): AudioContext | null {
    if (this.disposed || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.buildPinkNoiseBuffer(this.ctx, 4);
      this.setupAmbientBeds(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private buildPinkNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private setupAmbientBeds(ctx: AudioContext): void {
    if (!this.noiseBuffer || !this.masterGain) return;

    // 1. Gentle mountain valley wind
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.noiseBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 260;
    windFilter.Q.value = 1.6;

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.value = 0.09;
    const windLfoDepth = ctx.createGain();
    windLfoDepth.gain.value = 110;
    windLfo.connect(windLfoDepth);
    windLfoDepth.connect(windFilter.frequency);

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.42;

    windSrc.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    windSrc.start();
    windLfo.start();

    // 2. Soft rustling Korean red pine needles
    const pineSrc = ctx.createBufferSource();
    pineSrc.buffer = this.noiseBuffer;
    pineSrc.loop = true;

    const pineFilter = ctx.createBiquadFilter();
    pineFilter.type = 'bandpass';
    pineFilter.frequency.value = 2600;
    pineFilter.Q.value = 2.4;

    const pineLfo = ctx.createOscillator();
    pineLfo.type = 'sine';
    pineLfo.frequency.value = 0.17;
    const pineLfoGain = ctx.createGain();
    pineLfoGain.gain.value = 0.05;

    this.pineGain = ctx.createGain();
    this.pineGain.gain.value = 0.08;
    pineLfo.connect(pineLfoGain);
    pineLfoGain.connect(this.pineGain.gain);

    pineSrc.connect(pineFilter);
    pineFilter.connect(this.pineGain);
    this.pineGain.connect(this.masterGain);

    pineSrc.start();
    pineLfo.start();
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.75, now, 0.45);
      if (this.ambientIntervalId === null) {
        this.ambientIntervalId = window.setInterval(() => {
          if (!this.enabled || !this.ctx) return;
          if (Math.random() < 0.6) {
            this.playDistantMoktak();
          } else {
            this.playGentleWindChime();
          }
        }, 11500);
      }
    } else {
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0, now, 0.25);
      }
      if (this.ambientIntervalId !== null) {
        window.clearInterval(this.ambientIntervalId);
        this.ambientIntervalId = null;
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playDistantMoktak(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(420, now);
    osc1.frequency.exponentialRampToValueAtTime(340, now + 0.09);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(790, now);
    osc2.frequency.exponentialRampToValueAtTime(640, now + 0.07);

    filter.type = 'bandpass';
    filter.frequency.value = 580;
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);
  }

  public playGentleWindChime(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const freqs = [528, 792, 1056];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + idx * 0.04;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.028 / (idx + 1), start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 2.5);
    });
  }

  public playBowChime(bowIndex: number): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const baseFreq = [396, 440, 528][bowIndex % 3] ?? 440;
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = baseFreq;
    harmonic.type = 'sine';
    harmonic.frequency.value = baseFreq * 1.5;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.35;

    osc.connect(gain);
    harmonic.connect(harmGain);
    harmGain.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + 2.2);
    harmonic.stop(now + 2.2);
  }

  public playStoneLiftFriction(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.linearRampToValueAtTime(620, now + 0.35);
    filter.Q.value = 4.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(now);
    src.stop(now + 0.48);
  }

  public playStoneSettleThud(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    // Deep granite-on-granite body impact
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(86, now);
    subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.18);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.32, now + 0.008);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.3);

    // Crisp granite contact click/clack
    const clackSrc = ctx.createBufferSource();
    clackSrc.buffer = this.noiseBuffer;
    const clackFilter = ctx.createBiquadFilter();
    clackFilter.type = 'bandpass';
    clackFilter.frequency.value = 950;
    clackFilter.Q.value = 2.5;

    const clackGain = ctx.createGain();
    clackGain.gain.setValueAtTime(0.001, now);
    clackGain.gain.linearRampToValueAtTime(0.22, now + 0.004);
    clackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    clackSrc.connect(clackFilter);
    clackFilter.connect(clackGain);
    clackGain.connect(this.masterGain);
    clackSrc.start(now);
    clackSrc.stop(now + 0.11);
  }

  public playHeavyMagneticResonance(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const oscLow = ctx.createOscillator();
    const oscHarm = ctx.createOscillator();
    const gain = ctx.createGain();

    oscLow.type = 'sine';
    oscLow.frequency.setValueAtTime(52, now);
    oscLow.frequency.linearRampToValueAtTime(46, now + 1.4);

    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(104, now);
    oscHarm.frequency.linearRampToValueAtTime(92, now + 1.4);

    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.16;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    oscLow.connect(gain);
    oscHarm.connect(harmGain);
    harmGain.connect(gain);
    gain.connect(this.masterGain);

    oscLow.start(now);
    oscHarm.start(now);
    oscLow.stop(now + 1.9);
    oscHarm.stop(now + 1.9);
  }

  public playWishEmberChime(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const notes = [528, 660, 792, 1056];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + idx * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.9);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 2.0);
    });
  }

  public dispose(): void {
    this.disposed = true;
    this.enabled = false;
    if (this.ambientIntervalId !== null) {
      window.clearInterval(this.ambientIntervalId);
      this.ambientIntervalId = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
