// Procedural Audio Engine using Web Audio API
// High performance, zero external asset dependencies, instant playback

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('vertice_muted') === 'true';
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Background synth rhythm state
    this.bgmPlaying = false;
    this.bgmStep = 0;
    this.bgmTimer = null;
    this.tempo = 120; // BPM
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.startAmbientBeat();
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('vertice_muted', this.muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  // Play an energetic melodic spark chime that scales up with the combo!
  playCollect(combo = 1) {
    if (!this.ctx || this.muted) return;
    this.resume();

    // Pentatonic scale frequencies
    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
    const index = Math.min(Math.floor(combo - 1) % baseFreqs.length, baseFreqs.length - 1);
    const freq = baseFreqs[index];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  // Rare / Prism Crystal collect (Harmonic crystal chord)
  playRareCollect() {
    if (!this.ctx || this.muted) return;
    this.resume();

    const freqs = [659.25, 830.61, 987.77, 1318.51]; // E major chord
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.03);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35 + idx * 0.03);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(this.ctx.currentTime + idx * 0.03);
      osc.stop(this.ctx.currentTime + 0.4 + idx * 0.03);
    });
  }

  // Graze / Near Miss sound (sizzling cyber whoosh)
  playGraze() {
    if (!this.ctx || this.muted) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Laser warning telegraph beep
  playLaserTelegraph() {
    if (!this.ctx || this.muted) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Laser blast sound
  playLaserFire() {
    if (!this.ctx || this.muted) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Power-up activation
  playPowerUp() {
    if (!this.ctx || this.muted) return;
    this.resume();

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.05);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25 + idx * 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(this.ctx.currentTime + idx * 0.05);
      osc.stop(this.ctx.currentTime + 0.3 + idx * 0.05);
    });
  }

  // Shield Break EMP blast
  playShieldBreak() {
    if (!this.ctx || this.muted) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.45);
  }

  // Game Over explosion & pitch drop
  playGameOver() {
    if (!this.ctx || this.muted) return;
    this.resume();

    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.7);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }

  // Procedural synthwave bass groove that pulses in the background
  startAmbientBeat() {
    if (this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;

    const bassNotes = [65.41, 65.41, 77.78, 65.41, 58.27, 58.27, 73.42, 65.41]; // C2, Eb2, Bb1, D2
    const stepInterval = (60 / this.tempo) / 2; // 8th notes

    const tick = () => {
      if (!this.bgmPlaying || !this.ctx) return;

      const time = this.ctx.currentTime;
      const note = bassNotes[this.bgmStep % bassNotes.length];

      // Bass synth hit
      if (this.bgmStep % 2 === 0 && !this.muted) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);

        gain.gain.setValueAtTime(0.14, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.22);
      }

      // Cyber hihat click on off-beats
      if (this.bgmStep % 2 === 1 && !this.muted) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, time);

        gain.gain.setValueAtTime(0.03, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.05);
      }

      this.bgmStep++;
      this.bgmTimer = setTimeout(tick, stepInterval * 1000);
    };

    tick();
  }

  setTempo(bpm) {
    this.tempo = Math.max(100, Math.min(160, bpm));
  }
}

window.soundManager = new SoundManager();
