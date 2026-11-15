/**
 * CELL // SIGNAL — Hybrid Carceral Telemetry Drone Synthesizer Engine
 *
 * Architecture:
 *  - Layer I (Beauty Underneath): 4-voice stereo Wavetable Choir (Vital/Serum-inspired)
 *    with 8 procedural PeriodicWave spectral tables, morph crossfading, sub-oscillator,
 *    vowel formant filter, and cathedral shimmer reverb.
 *  - Layer II (Carceral Apparatus): 4-Operator FM Metallic Cluster (Dexed-inspired)
 *    with operator feedback, 3-Band Sculptural Noise Machine, Concrete Cell Comb
 *    Resonator, and custom AudioWorklet Wavefolder + Bitcrusher/Decimator.
 *  - Custody Death Rupture Engine: Immediate FM iron-slam + crushed noise tear +
 *    brief sanctuary breath-cutout + memorial bell tuned from decedent metadata.
 *  - Stage Safety: 22Hz DC blocker + brickwall DynamicsCompressor limiter (-2 dBFS).
 */

const WORKLET_CODE = `
class CarceralCrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'foldDrive', defaultValue: 0.25, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'bitCrush', defaultValue: 0.15, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'wetMix', defaultValue: 0.45, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.holdL = 0;
    this.holdR = 0;
    this.phase = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;

    const fold = parameters.foldDrive[0];
    const crush = parameters.bitCrush[0];
    const wet = parameters.wetMix[0];

    const gain = 1 + fold * 7.5;
    const stepSamples = Math.max(1, Math.floor(1 + Math.pow(crush, 1.8) * 32));
    const levels = Math.max(4, Math.floor(Math.pow(2, 12 - crush * 9.5)));

    const inL = input[0];
    const inR = input[1] || input[0];
    const outL = output[0];
    const outR = output[1] || output[0];

    for (let i = 0; i < inL.length; i++) {
      this.phase++;
      if (this.phase >= stepSamples) {
        this.phase = 0;
        // Continuous wavefolder + bit quantization
        let sL = Math.sin(inL[i] * gain * 1.15);
        let sR = Math.sin(inR[i] * gain * 1.15);
        if (crush > 0.03) {
          sL = Math.round(sL * levels) / levels;
          sR = Math.round(sR * levels) / levels;
        }
        this.holdL = sL;
        this.holdR = sR;
      }

      const dryMix = 1 - wet;
      outL[i] = inL[i] * dryMix + this.holdL * wet * 0.85;
      if (outR !== outL) {
        outR[i] = inR[i] * dryMix + this.holdR * wet * 0.85;
      }
    }
    return true;
  }
}
registerProcessor('carceral-crush-processor', CarceralCrushProcessor);
`;

const ROOT_SEMITONES = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11
};

const MODE_INTERVALS = {
  dorian: [0, 7, 10, 14, 15],
  aeolian: [0, 7, 8, 10, 15],
  phrygian: [0, 7, 8, 10, 13],
  harmonic_minor: [0, 7, 8, 11, 15],
  major: [0, 7, 11, 14, 16],
  lydian: [0, 7, 11, 16, 18],
  mixolydian: [0, 7, 10, 14, 16],
  pentatonic_minor: [0, 7, 10, 12, 15],
  fifths: [0, 7, 12, 19, 24]
};

function midiToFreq(midi, a4Freq = 440) {
  return a4Freq * Math.pow(2, (midi - 69) / 12);
}

function getChoirNotes(rootKey = 'D', modeKey = 'dorian', a4Freq = 440) {
  const semi = ROOT_SEMITONES[rootKey] ?? 2; // Default D
  const baseMidi = 36 + semi; // C2 (36) .. B2 (47)
  const intervals = MODE_INTERVALS[modeKey] || MODE_INTERVALS.dorian;
  return intervals.map(iv => midiToFreq(baseMidi + iv, a4Freq));
}

export const SYNTH_PRESETS = {
  elegy: {
    modeKey: 'dorian',
    morph: 35,
    detune: 18,
    cutoff: 1450,
    sub: 48,
    fmDepth: 42,
    fmRatio1: 141,
    fmRatio2: 272,
    fmRatio3: 383,
    fmFeedback: 28,
    noiseSub: 36,
    noiseMid: 24,
    noiseHigh: 16,
    fold: 30,
    crush: 15,
    comb: 32,
    reverb: 54,
    delay: 30
  },
  panopticon: {
    modeKey: 'phrygian',
    morph: 68,
    detune: 32,
    cutoff: 1100,
    sub: 58,
    fmDepth: 74,
    fmRatio1: 173,
    fmRatio2: 314,
    fmRatio3: 519,
    fmFeedback: 62,
    noiseSub: 48,
    noiseMid: 52,
    noiseHigh: 38,
    fold: 56,
    crush: 42,
    comb: 66,
    reverb: 40,
    delay: 46
  },
  sanctuary: {
    modeKey: 'lydian',
    morph: 24,
    detune: 12,
    cutoff: 2400,
    sub: 52,
    fmDepth: 22,
    fmRatio1: 100,
    fmRatio2: 200,
    fmRatio3: 300,
    fmFeedback: 12,
    noiseSub: 20,
    noiseMid: 12,
    noiseHigh: 8,
    fold: 15,
    crush: 6,
    comb: 16,
    reverb: 74,
    delay: 38
  },
  stock_shock: {
    modeKey: 'harmonic_minor',
    morph: 58,
    detune: 40,
    cutoff: 1700,
    sub: 42,
    fmDepth: 84,
    fmRatio1: 141,
    fmRatio2: 417,
    fmRatio3: 683,
    fmFeedback: 72,
    noiseSub: 30,
    noiseMid: 46,
    noiseHigh: 42,
    fold: 64,
    crush: 48,
    comb: 54,
    reverb: 38,
    delay: 52
  },
  memorial: {
    modeKey: 'fifths',
    morph: 44,
    detune: 15,
    cutoff: 960,
    sub: 72,
    fmDepth: 34,
    fmRatio1: 150,
    fmRatio2: 241,
    fmRatio3: 383,
    fmFeedback: 24,
    noiseSub: 52,
    noiseMid: 20,
    noiseHigh: 12,
    fold: 22,
    crush: 18,
    comb: 28,
    reverb: 78,
    delay: 44
  }
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class CarceralSynthEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.muted = true;
    this.workletStatus = 'STANDBY';

    this.params = {
      ...SYNTH_PRESETS.elegy,
      rootKey: 'D',
      modeKey: 'dorian',
      a4Freq: 440,
      masterVol: 78,
      xyX: 0.35, // Morph / Formant
      xyY: 0.55  // Human Sanctuary Force (0..1)
    };
    this.activeNotes = getChoirNotes(this.params.rootKey, this.params.modeKey, this.params.a4Freq);

    // Computed struggle state (exposed to visualizer)
    this.state = {
      sanctuaryStrength: 0.55,
      systemicPressure: 0.32,
      effectiveCutoff: 1450,
      effectiveFmIndex: 0.35,
      effectiveFold: 0.25,
      effectiveCrush: 0.15,
      effectiveComb: 0.32,
      deathShock: 0
    };

    this.nodes = {};
    this.wavetables = [];
    this.analyser = null;
    this.sanctuaryAnalyser = null;
    this._timeData = null;
    this._freqData = null;
    this._sanctuaryTimeData = null;
  }

  setParam(audioParam, val, min, max, tc = 0.04) {
    if (!this.ctx || !audioParam) return;
    const num = Number(val);
    if (!Number.isFinite(num)) return;
    const safe = clamp(num, min, max);
    audioParam.setTargetAtTime(safe, this.ctx.currentTime, tc);
  }

  async init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.setMuted(false);
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.buildWavetables();
    await this.buildAudioGraph();
    this.setMusicalKeyAndMode(this.params.rootKey, this.params.modeKey, this.params.a4Freq);

    this.initialized = true;
    this.setMuted(false);
  }

  buildWavetables() {
    const ctx = this.ctx;
    const size = 48;

    const makeWave = (fn) => {
      const real = new Float32Array(size);
      const imag = new Float32Array(size);
      for (let h = 1; h < size; h++) {
        const [r, im] = fn(h);
        real[h] = r;
        imag[h] = im;
      }
      return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    };

    // Table A: Warm Organ / Cathedral Pad
    this.wavetables.push(makeWave(h => [0, (h <= 8 ? 1 / Math.pow(h, 1.35) : 0.1 / (h * h))]));
    // Table B: Vocal Glass Choir (Formant peaks around harmonics 3, 6, 11)
    this.wavetables.push(makeWave(h => {
      const f1 = Math.exp(-Math.pow((h - 3) / 1.5, 2));
      const f2 = Math.exp(-Math.pow((h - 7) / 2.2, 2)) * 0.65;
      const f3 = Math.exp(-Math.pow((h - 13) / 3.0, 2)) * 0.35;
      return [0, (1 / h) * 0.45 + (f1 + f2 + f3) * 0.45];
    }));
    // Table C: Bowed Strings / Harmonium
    this.wavetables.push(makeWave(h => [0, (h % 2 === 1 ? 0.9 : 0.45) / Math.pow(h, 1.1)]));
    // Table D: Metallic Razor Saw
    this.wavetables.push(makeWave(h => [0, (h % 2 === 0 ? -1 : 1) / Math.pow(h, 0.85)]));
  }

  async buildAudioGraph() {
    const ctx = this.ctx;

    // Master Safety Chain: DC Blocker -> Brickwall Limiter -> Master Gain -> Output
    const dcBlocker = ctx.createBiquadFilter();
    dcBlocker.type = 'highpass';
    dcBlocker.frequency.value = 22;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2.0;
    limiter.knee.value = 0.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.09;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;
    this._timeData = new Uint8Array(this.analyser.fftSize);
    this._freqData = new Uint8Array(this.analyser.frequencyBinCount);

    dcBlocker.connect(limiter);
    limiter.connect(masterGain);
    masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // Space FX: Cathedral Impulse Reverb + Stereo Tape Delay
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.54;
    const convolver = ctx.createConvolver();
    convolver.buffer = this.createCathedralImpulse(3.6, 2.8);
    const reverbTone = ctx.createBiquadFilter();
    reverbTone.type = 'lowpass';
    reverbTone.frequency.value = 4200;
    reverbSend.connect(convolver);
    convolver.connect(reverbTone);
    reverbTone.connect(dcBlocker);

    const delaySend = ctx.createGain();
    delaySend.gain.value = 0.30;
    const delayL = ctx.createDelay(1.0);
    delayL.delayTime.value = 0.37;
    const delayR = ctx.createDelay(1.0);
    delayR.delayTime.value = 0.53;
    const delayFb = ctx.createGain();
    delayFb.gain.value = 0.38;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2400;
    delaySend.connect(delayL);
    delayL.connect(delayFilter);
    delayFilter.connect(delayR);
    delayR.connect(delayFb);
    delayFb.connect(delayL);
    delayFilter.connect(dcBlocker);
    delayR.connect(dcBlocker);

    // ==================== LAYER I: HUMAN SANCTUARY CHOIR ====================
    const sanctuaryPreBus = ctx.createGain();
    sanctuaryPreBus.gain.value = 0.45;

    this.sanctuaryAnalyser = ctx.createAnalyser();
    this.sanctuaryAnalyser.fftSize = 1024;
    this._sanctuaryTimeData = new Uint8Array(this.sanctuaryAnalyser.fftSize);

    const sanctuaryFilter = ctx.createBiquadFilter();
    sanctuaryFilter.type = 'lowpass';
    sanctuaryFilter.frequency.value = 1450;
    sanctuaryFilter.Q.value = 1.4;

    const formantFilter = ctx.createBiquadFilter();
    formantFilter.type = 'bandpass';
    formantFilter.frequency.value = 720;
    formantFilter.Q.value = 1.8;

    const formantMix = ctx.createGain();
    formantMix.gain.value = 0.35;

    const sanctuaryDuckGain = ctx.createGain();
    sanctuaryDuckGain.gain.value = 0.8;

    sanctuaryPreBus.connect(this.sanctuaryAnalyser);
    sanctuaryPreBus.connect(sanctuaryFilter);
    sanctuaryPreBus.connect(formantFilter);
    formantFilter.connect(formantMix);

    sanctuaryFilter.connect(sanctuaryDuckGain);
    formantMix.connect(sanctuaryDuckGain);

    // Sanctuary splits cleanly to cathedral space AND into the carceral crush bus when pressured
    const sanctuaryCleanGain = ctx.createGain();
    sanctuaryCleanGain.gain.value = 0.72;
    sanctuaryDuckGain.connect(sanctuaryCleanGain);
    sanctuaryCleanGain.connect(dcBlocker);
    sanctuaryCleanGain.connect(reverbSend);
    sanctuaryCleanGain.connect(delaySend);

    const choirVoices = [];
    const baseScale = this.activeNotes;
    const pans = [-0.68, 0.68, -0.35, 0.35, 0];

    for (let i = 0; i < 5; i++) {
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      oscA.setPeriodicWave(this.wavetables[0]);
      oscB.setPeriodicWave(this.wavetables[1]);
      oscA.frequency.value = baseScale[i];
      oscB.frequency.value = baseScale[i];

      const gainA = ctx.createGain();
      const gainB = ctx.createGain();
      gainA.gain.value = 0.65;
      gainB.gain.value = 0.35;

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = i === 0 ? 0.24 : 0.16;

      const panner = ctx.createStereoPanner();
      panner.pan.value = pans[i];

      oscA.connect(gainA);
      oscB.connect(gainB);
      gainA.connect(voiceGain);
      gainB.connect(voiceGain);
      voiceGain.connect(panner);
      panner.connect(sanctuaryPreBus);

      oscA.start();
      oscB.start();
      choirVoices.push({ oscA, oscB, gainA, gainB, voiceGain, baseFreq: baseScale[i] });
    }

    // Sub-Harmonic Heartbeat Oscillator
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = baseScale[0] * 0.5;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.22;
    subOsc.connect(subGain);
    subGain.connect(dcBlocker);
    subOsc.start();

    // ==================== LAYER II: 4-OP FM METALLIC ENGINE (DEXED) ====================
    const fmBus = ctx.createGain();
    fmBus.gain.value = 0.28;

    const fmCarrier = ctx.createOscillator();
    fmCarrier.type = 'sine';
    fmCarrier.frequency.value = 73.42;

    const op2 = ctx.createOscillator();
    op2.type = 'sine';
    op2.frequency.value = 73.42 * 1.41;
    const op2Gain = ctx.createGain();
    op2Gain.gain.value = 85;

    const op3 = ctx.createOscillator();
    op3.type = 'sine';
    op3.frequency.value = 73.42 * 2.72;
    const op3Gain = ctx.createGain();
    op3Gain.gain.value = 110;

    const op4 = ctx.createOscillator();
    op4.type = 'sine';
    op4.frequency.value = 73.42 * 3.83;
    const op4Gain = ctx.createGain();
    op4Gain.gain.value = 90;

    // Operator 4 self-feedback loop (via short delay)
    const op4FbDelay = ctx.createDelay(0.05);
    op4FbDelay.delayTime.value = 0.008;
    const op4FbGain = ctx.createGain();
    op4FbGain.gain.value = 60;
    op4.connect(op4FbDelay);
    op4FbDelay.connect(op4FbGain);
    op4FbGain.connect(op4.frequency);

    op2.connect(op2Gain);
    op3.connect(op3Gain);
    op4.connect(op4Gain);
    op2Gain.connect(fmCarrier.frequency);
    op3Gain.connect(fmCarrier.frequency);
    op4Gain.connect(fmCarrier.frequency);

    // 60Hz/120Hz Fluorescent Cell Ballast Hum
    const ballastOsc = ctx.createOscillator();
    ballastOsc.type = 'sawtooth';
    ballastOsc.frequency.value = 60;
    const ballastFilter = ctx.createBiquadFilter();
    ballastFilter.type = 'bandpass';
    ballastFilter.frequency.value = 120;
    ballastFilter.Q.value = 6;
    const ballastGain = ctx.createGain();
    ballastGain.gain.value = 0.06;
    ballastOsc.connect(ballastFilter);
    ballastFilter.connect(ballastGain);
    ballastGain.connect(fmBus);

    fmCarrier.connect(fmBus);
    fmCarrier.start();
    op2.start();
    op3.start();
    op4.start();
    ballastOsc.start();

    // ==================== 3-BAND SCULPTURAL NOISE MACHINE ====================
    const noiseBuf = this.createStereoNoiseBuffer(5);
    const noiseBus = ctx.createGain();
    noiseBus.gain.value = 0.55;

    const makeNoiseBand = (filterType, freq, q, initialGain) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const flt = ctx.createBiquadFilter();
      flt.type = filterType;
      flt.frequency.value = freq;
      flt.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = initialGain;
      src.connect(flt);
      flt.connect(g);
      g.connect(noiseBus);
      src.start();
      return { src, flt, g };
    };

    const noiseSub = makeNoiseBand('lowpass', 105, 1.4, 0.28);
    const noiseMid = makeNoiseBand('bandpass', 1650, 2.4, 0.14);
    const noiseHigh = makeNoiseBand('highpass', 4800, 1.1, 0.08);

    // ==================== CRUSH / WAVEFOLDER / CELL COMB BUS ====================
    const apparatusPreCrush = ctx.createGain();
    apparatusPreCrush.gain.value = 0.85;

    // Route some Sanctuary Choir into the Carceral Crush bus so reality presses against beauty
    const sanctuaryLeakToCrush = ctx.createGain();
    sanctuaryLeakToCrush.gain.value = 0.25;
    sanctuaryDuckGain.connect(sanctuaryLeakToCrush);
    sanctuaryLeakToCrush.connect(apparatusPreCrush);
    fmBus.connect(apparatusPreCrush);
    noiseBus.connect(apparatusPreCrush);

    let crushNode = null;
    try {
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);
      crushNode = new AudioWorkletNode(ctx, 'carceral-crush-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      });
      this.workletStatus = 'WORKLET DSP ACTIVE';
    } catch (_) {
      // Fallback WaveShaper transfer curve
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.createWavefolderCurve(2.8);
      shaper.oversample = '2x';
      crushNode = shaper;
      this.workletStatus = 'WAVESHAPER FALLBACK';
    }

    // Cell Acoustic Comb Resonator (6x8ft concrete cell axial reflection)
    const combDelay = ctx.createDelay(0.05);
    combDelay.delayTime.value = 0.0118; // ~84.7 Hz concrete room mode
    const combFeedback = ctx.createGain();
    combFeedback.gain.value = 0.35;
    const combDamp = ctx.createBiquadFilter();
    combDamp.type = 'lowpass';
    combDamp.frequency.value = 2600;
    const combOut = ctx.createGain();
    combOut.gain.value = 0.48;

    apparatusPreCrush.connect(crushNode);
    crushNode.connect(combOut);
    crushNode.connect(combDelay);
    combDelay.connect(combDamp);
    combDamp.connect(combFeedback);
    combFeedback.connect(combDelay);
    combDamp.connect(combOut);

    combOut.connect(dcBlocker);
    combOut.connect(reverbSend);
    combOut.connect(delaySend);

    this.nodes = {
      dcBlocker,
      limiter,
      masterGain,
      reverbSend,
      delaySend,
      sanctuaryPreBus,
      sanctuaryFilter,
      formantFilter,
      formantMix,
      sanctuaryDuckGain,
      sanctuaryCleanGain,
      sanctuaryLeakToCrush,
      choirVoices,
      subOsc,
      subGain,
      fmBus,
      fmCarrier,
      op2,
      op2Gain,
      op3,
      op3Gain,
      op4,
      op4Gain,
      op4FbGain,
      ballastGain,
      noiseBus,
      noiseSub,
      noiseMid,
      noiseHigh,
      apparatusPreCrush,
      crushNode,
      combDelay,
      combFeedback,
      combOut
    };
  }

  createStereoNoiseBuffer(seconds = 4) {
    const sr = this.ctx.sampleRate;
    const length = Math.floor(sr * seconds);
    const buffer = this.ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.950 * b2 + white * 0.048;
        data[i] = clamp((b0 + b1 + b2 + white * 0.18) * 1.4, -1, 1);
      }
    }
    return buffer;
  }

  createCathedralImpulse(duration = 3.5, decay = 2.6) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const impulse = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay) * (1 - Math.exp(-i / (sr * 0.025)));
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return impulse;
  }

  createWavefolderCurve(drive = 2.5) {
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.sin(x * Math.PI * drive * 0.5) * 0.78;
    }
    return curve;
  }

  setMusicalKeyAndMode(rootKey = this.params.rootKey, modeKey = this.params.modeKey, a4Freq = this.params.a4Freq) {
    this.params.rootKey = rootKey;
    this.params.modeKey = modeKey;
    this.params.a4Freq = Number(a4Freq) || 440;

    const notes = getChoirNotes(this.params.rootKey, this.params.modeKey, this.params.a4Freq);
    this.activeNotes = notes;
    if (!this.initialized) return;

    this.nodes.choirVoices.forEach((v, idx) => {
      v.baseFreq = notes[idx % notes.length];
    });
    this.setParam(this.nodes.subOsc.frequency, notes[0] * 0.5, 24, 180, 0.15);
    this.setParam(this.nodes.fmCarrier.frequency, notes[0], 30, 320, 0.12);
  }

  setParamValue(key, value) {
    if (key === 'rootKey' || key === 'modeKey' || key === 'a4Freq') {
      this.params[key] = key === 'a4Freq' ? Number(value) : value;
      this.setMusicalKeyAndMode(this.params.rootKey, this.params.modeKey, this.params.a4Freq);
      return;
    }
    this.params[key] = Number(value);
  }

  applyPreset(presetKey) {
    const p = SYNTH_PRESETS[presetKey];
    if (!p) return;
    const savedRoot = this.params.rootKey;
    const savedA4 = this.params.a4Freq;
    Object.assign(this.params, p);
    this.params.rootKey = savedRoot;
    this.params.a4Freq = savedA4;
    this.setMusicalKeyAndMode(this.params.rootKey, this.params.modeKey, this.params.a4Freq);
  }

  setMuted(mute) {
    this.muted = Boolean(mute);
    if (!this.initialized || !this.nodes.masterGain) return;
    const targetVol = this.muted ? 0 : (this.params.masterVol / 100) * 0.72;
    this.setParam(this.nodes.masterGain.gain, targetVol, 0, 0.9, 0.06);
  }

  /**
   * Drives all audio nodes from the live telemetry snapshot + performer struggle input.
   */
  update(snapshot, dt) {
    if (!this.initialized || !this.ctx) return;

    this.state.deathShock = Math.max(0, this.state.deathShock - dt * 0.9);

    const ch = snapshot.channels;
    const equityMod = ch.equity.modulated;
    const spendingMod = ch.spending.modulated;
    const mortalityMod = ch.mortality.modulated;
    const communityMod = ch.community.modulated;
    const nycdocMod = ch.nycdoc ? ch.nycdoc.modulated : 0;

    const performerPush = clamp(this.params.xyY, 0, 1);
    const performerMorph = clamp(this.params.xyX, 0, 1);

    // Core Push-and-Pull Mechanic:
    // Systemic pressure fights against the user's sanctuary beauty
    const rawPressure = snapshot.systemicPressure;
    const sanctuaryStrength = clamp(
      performerPush * 0.92 + communityMod * 0.25 - rawPressure * 0.44 - this.state.deathShock * 0.35,
      0.04,
      1.0
    );
    const systemicPressure = clamp(
      rawPressure * (1.18 - performerPush * 0.52) + this.state.deathShock * 0.45,
      0.03,
      1.35
    );

    this.state.sanctuaryStrength = sanctuaryStrength;
    this.state.systemicPressure = systemicPressure;

    // 1. Wavetable Choir Morph, Detune & Struggle Filtering
    const morphVal = clamp((this.params.morph / 100) * 0.55 + performerMorph * 0.45 + communityMod * 0.15, 0, 1);
    const baseDetune = this.params.detune;
    // High equity volatility pulls the choir slightly out of tune
    const tensionCents = baseDetune + equityMod * 18 + this.state.deathShock * 28;

    this.nodes.choirVoices.forEach((v, idx) => {
      const spread = (idx - 2) * tensionCents;
      // Subtle pitch sag under overwhelming systemic pressure
      const sagRatio = 1 - Math.max(0, systemicPressure - 0.65) * 0.012;
      const targetFreq = v.baseFreq * sagRatio;
      this.setParam(v.oscA.frequency, targetFreq, 28, 1800, 0.08);
      this.setParam(v.oscB.frequency, targetFreq, 28, 1800, 0.08);
      this.setParam(v.oscA.detune, spread, -120, 120, 0.06);
      this.setParam(v.oscB.detune, -spread * 0.75, -120, 120, 0.06);

      this.setParam(v.gainA.gain, 1 - morphVal * 0.85, 0, 1, 0.06);
      this.setParam(v.gainB.gain, morphVal * 0.95, 0, 1, 0.06);
    });

    const targetCutoff = clamp(
      this.params.cutoff * (0.35 + sanctuaryStrength * 1.15) - spendingMod * 360,
      160,
      7800
    );
    this.state.effectiveCutoff = targetCutoff;
    this.setParam(this.nodes.sanctuaryFilter.frequency, targetCutoff, 140, 8000, 0.06);

    // Formant filter cries upward with Ch 04 Community Petitions & Performer X
    const formantFreq = clamp(380 + performerMorph * 680 + communityMod * 520, 260, 2200);
    this.setParam(this.nodes.formantFilter.frequency, formantFreq, 220, 2600, 0.07);
    this.setParam(this.nodes.formantMix.gain, 0.18 + communityMod * 0.32 + sanctuaryStrength * 0.18, 0.05, 0.8, 0.07);

    // Sanctuary ducking vs pushback
    const cleanLevel = clamp(0.24 + sanctuaryStrength * 0.72 - this.state.deathShock * 0.25, 0.1, 0.95);
    this.setParam(this.nodes.sanctuaryCleanGain.gain, cleanLevel, 0.05, 1.0, 0.06);
    this.setParam(this.nodes.sanctuaryLeakToCrush.gain, clamp(0.08 + systemicPressure * 0.36, 0.05, 0.7), 0.02, 0.8, 0.06);
    this.setParam(this.nodes.subGain.gain, (this.params.sub / 100) * (0.28 + spendingMod * 0.18), 0, 0.55, 0.06);

    // 2. Dexed 4-Operator FM Metallic Engine (Driven by CH 01 Equity)
    const rootFreq = (this.activeNotes && this.activeNotes[0]) || 73.42;
    const r1 = (this.params.fmRatio1 / 100) + equityMod * 0.12;
    const r2 = (this.params.fmRatio2 / 100) + mortalityMod * 0.18;
    const r3 = (this.params.fmRatio3 / 100);

    this.setParam(this.nodes.op2.frequency, rootFreq * r1, 20, 4000, 0.05);
    this.setParam(this.nodes.op3.frequency, rootFreq * r2, 20, 6000, 0.05);
    this.setParam(this.nodes.op4.frequency, rootFreq * r3, 20, 8000, 0.05);

    const fmDepthNorm = clamp((this.params.fmDepth / 100) * (0.45 + equityMod * 0.95) + this.state.deathShock * 0.45, 0, 1.8);
    this.state.effectiveFmIndex = fmDepthNorm;

    this.setParam(this.nodes.op2Gain.gain, fmDepthNorm * 140, 0, 650, 0.04);
    this.setParam(this.nodes.op3Gain.gain, fmDepthNorm * 185, 0, 850, 0.04);
    this.setParam(this.nodes.op4Gain.gain, fmDepthNorm * 120, 0, 700, 0.04);
    this.setParam(this.nodes.op4FbGain.gain, (this.params.fmFeedback / 100) * (40 + equityMod * 110), 0, 260, 0.05);
    this.setParam(this.nodes.fmBus.gain, clamp(0.08 + fmDepthNorm * 0.24 - sanctuaryStrength * 0.05, 0.04, 0.45), 0, 0.5, 0.05);
    this.setParam(this.nodes.ballastGain.gain, clamp(0.02 + systemicPressure * 0.05, 0.01, 0.14), 0, 0.2, 0.08);

    // 3. 3-Band Noise, Wavefolder, Bitcrusher & Concrete Cell Comb
    this.setParam(this.nodes.noiseSub.g.gain, (this.params.noiseSub / 100) * (0.18 + spendingMod * 0.32), 0, 0.6, 0.06);
    this.setParam(this.nodes.noiseMid.g.gain, (this.params.noiseMid / 100) * (0.08 + equityMod * 0.22), 0, 0.45, 0.06);
    this.setParam(this.nodes.noiseMid.flt.frequency, clamp(950 + equityMod * 1800, 400, 4200), 300, 5000, 0.08);
    this.setParam(this.nodes.noiseHigh.g.gain, (this.params.noiseHigh / 100) * (0.04 + mortalityMod * 0.26 + this.state.deathShock * 0.22), 0, 0.45, 0.04);

    const effFold = clamp((this.params.fold / 100) * 0.5 + spendingMod * 0.52 - sanctuaryStrength * 0.16, 0.02, 1.0);
    const effCrush = clamp((this.params.crush / 100) * 0.4 + mortalityMod * 0.52 + this.state.deathShock * 0.45, 0.0, 1.0);
    this.state.effectiveFold = effFold;
    this.state.effectiveCrush = effCrush;

    if (this.nodes.crushNode?.parameters) {
      const p = this.nodes.crushNode.parameters;
      this.setParam(p.get('foldDrive'), effFold, 0, 1, 0.04);
      this.setParam(p.get('bitCrush'), effCrush, 0, 1, 0.04);
      this.setParam(p.get('wetMix'), clamp(0.28 + systemicPressure * 0.45, 0.15, 0.92), 0, 1, 0.04);
    }

    const combMod = clamp(equityMod * 0.55 + nycdocMod * 0.55, 0, 1.35);
    const effComb = clamp((this.params.comb / 100) * (0.48 + combMod * 0.42), 0.05, 0.78);
    this.state.effectiveComb = effComb;
    this.setParam(this.nodes.combFeedback.gain, effComb, 0, 0.78, 0.05);
    this.setParam(
      this.nodes.combDelay.delayTime,
      clamp(0.008 + (1 - clamp(nycdocMod * 0.6 + equityMod * 0.4, 0, 1)) * 0.007, 0.005, 0.025),
      0.004,
      0.03,
      0.06
    );

    // 4. Space & Master Gain
    this.setParam(this.nodes.reverbSend.gain, clamp((this.params.reverb / 100) * (0.65 + sanctuaryStrength * 0.5), 0.1, 1.1), 0, 1.2, 0.08);
    this.setParam(this.nodes.delaySend.gain, clamp((this.params.delay / 100) * 0.65, 0, 0.8), 0, 0.9, 0.08);

    if (!this.muted) {
      this.setParam(this.nodes.masterGain.gain, (this.params.masterVol / 100) * 0.72, 0, 0.9, 0.06);
    }
  }

  /**
   * Aggressive metallic rupture + brief breath cutout + resonant memorial bell
   * triggered when a custody death record arrives from Incarceration Transparency / UCLA.
   */
  triggerDeathRupture(record, mortalityAggression = 1.25) {
    if (!this.initialized || !this.ctx || this.muted) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const harsh = clamp(mortalityAggression, 0.25, 2.0);
    this.state.deathShock = clamp(0.7 + harsh * 0.25, 0.5, 1.0);

    // 1. Brief Sanctuary breath-cutout (shock ducks the underlying warmth for 220ms)
    this.nodes.sanctuaryDuckGain.gain.cancelScheduledValues(now);
    this.nodes.sanctuaryDuckGain.gain.setValueAtTime(this.nodes.sanctuaryDuckGain.gain.value, now);
    this.nodes.sanctuaryDuckGain.gain.linearRampToValueAtTime(0.16, now + 0.025);
    this.nodes.sanctuaryDuckGain.gain.exponentialRampToValueAtTime(0.8, now + 0.65);

    // 2. Iron Cell Slam (Harsh FM Metallic Impact)
    const slamCarrier = ctx.createOscillator();
    const slamMod = ctx.createOscillator();
    const slamModGain = ctx.createGain();
    const slamEnv = ctx.createGain();
    const slamFilter = ctx.createBiquadFilter();

    slamCarrier.type = 'triangle';
    slamMod.type = 'sawtooth';
    const baseSlamFreq = record?.age ? clamp(165 - record.age * 1.1, 78, 150) : 112;
    slamCarrier.frequency.setValueAtTime(baseSlamFreq * 1.9, now);
    slamCarrier.frequency.exponentialRampToValueAtTime(baseSlamFreq, now + 0.18);

    slamMod.frequency.setValueAtTime(baseSlamFreq * 2.718, now);
    slamModGain.gain.setValueAtTime(680 * harsh, now);
    slamModGain.gain.exponentialRampToValueAtTime(18, now + 0.42);

    slamFilter.type = 'bandpass';
    slamFilter.frequency.setValueAtTime(2800, now);
    slamFilter.frequency.exponentialRampToValueAtTime(240, now + 0.48);
    slamFilter.Q.value = 1.6;

    slamEnv.gain.setValueAtTime(0.001, now);
    slamEnv.gain.linearRampToValueAtTime(clamp(0.42 * harsh, 0.15, 0.68), now + 0.006);
    slamEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    slamMod.connect(slamModGain);
    slamModGain.connect(slamCarrier.frequency);
    slamCarrier.connect(slamFilter);
    slamFilter.connect(slamEnv);
    slamEnv.connect(this.nodes.crushNode);

    slamCarrier.start(now);
    slamMod.start(now);
    slamCarrier.stop(now + 0.6);
    slamMod.stop(now + 0.6);

    // 3. Bitcrushed Noise Tear
    const tearSrc = ctx.createBufferSource();
    tearSrc.buffer = this.createStereoNoiseBuffer(0.45);
    const tearFilter = ctx.createBiquadFilter();
    tearFilter.type = 'highpass';
    tearFilter.frequency.setValueAtTime(1400, now);
    const tearEnv = ctx.createGain();
    tearEnv.gain.setValueAtTime(0.001, now);
    tearEnv.gain.linearRampToValueAtTime(clamp(0.32 * harsh, 0.1, 0.5), now + 0.008);
    tearEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    tearSrc.connect(tearFilter);
    tearFilter.connect(tearEnv);
    tearEnv.connect(this.nodes.crushNode);
    tearSrc.start(now);
    tearSrc.stop(now + 0.36);

    // 4. Haunting Memorial Bell (rings through the cathedral reverb)
    // Tuned to the active Key & Mode; decay proportional to days_incarcerated; adds dissonant tritone partial if Pre-Trial
    const age = record?.age || 38;
    const days = record?.days_incarcerated || 180;
    const isPretrial = /pre-?trial|unconvicted|civil/i.test(record?.trial_status || '');

    const scalePool = this.activeNotes && this.activeNotes.length ? this.activeNotes : [73.42, 110, 174.61, 261.63, 329.63];
    const scaleChoice = scalePool[Math.abs(Math.round(age)) % scalePool.length];
    const bellRoot = clamp(scaleChoice * (scaleChoice < 160 ? 2 : 1), 190, 520);
    const bellDecay = clamp(3.2 + Math.log10(Math.max(10, days)) * 1.4, 3.2, 7.8);
    const partials = isPretrial ? [1.0, 1.414, 2.0, 2.756] : [1.0, 1.5, 2.0, 2.98];

    partials.forEach((ratio, i) => {
      const pOsc = ctx.createOscillator();
      const pEnv = ctx.createGain();
      pOsc.type = 'sine';
      pOsc.frequency.setValueAtTime(bellRoot * ratio, now + 0.09);

      const amp = (0.14 / (i + 1)) * (i === 1 && isPretrial ? 1.25 : 1.0);
      pEnv.gain.setValueAtTime(0.0001, now + 0.09);
      pEnv.gain.linearRampToValueAtTime(amp, now + 0.12);
      pEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.09 + bellDecay / (1 + i * 0.35));

      pOsc.connect(pEnv);
      pEnv.connect(this.nodes.dcBlocker);
      pEnv.connect(this.nodes.reverbSend);
      pOsc.start(now + 0.09);
      pOsc.stop(now + 0.15 + bellDecay);
    });
  }

  /**
   * Subtle acoustic accent when a Federal Contract Award or Equity Spike hits.
   */
  triggerContractPulse(spendingMod = 0.7) {
    if (!this.initialized || !this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const rootFreq = (this.activeNotes && this.activeNotes[0]) || 73.42;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rootFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(clamp(rootFreq * 0.5, 28, 120), now + 0.65);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(clamp(0.26 * spendingMod, 0.08, 0.38), now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(env);
    env.connect(this.nodes.dcBlocker);
    osc.start(now);
    osc.stop(now + 0.85);
  }

  /**
   * Modal cell chime quantized to the active musical Key/Mode for NYC DOC custody records.
   * Detention duration stretches decay; Brad H. mental health observation or pre-trial DE status adds an upper partial.
   */
  triggerNycInmatePulse(record, nycAggression = 1.0) {
    if (!this.initialized || !this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const agg = clamp(Number.isFinite(Number(nycAggression)) ? Number(nycAggression) : 1.0, 0.1, 2.0);
    const daysHeld = clamp(Number.isFinite(Number(record?.daysHeld)) ? Number(record.daysHeld) : 45, 1, 1800);
    const decay = clamp(0.45 + Math.log10(daysHeld + 1) * 0.42, 0.45, 1.9);

    const notes = this.activeNotes && this.activeNotes.length ? this.activeNotes : [73.42, 87.31, 98.0, 110.0, 130.81];
    const idSeed = Number.parseInt(record?.inmateid, 10);
    const seedIdx = Number.isFinite(idSeed) ? Math.abs(idSeed) : Math.round(daysHeld);
    const baseNote = notes[seedIdx % notes.length];
    const baseFreq = clamp(baseNote * 2, 110, 880);

    const primaryOsc = ctx.createOscillator();
    const primaryGain = ctx.createGain();
    primaryOsc.type = 'triangle';
    primaryOsc.frequency.setValueAtTime(baseFreq, now);

    const peakGain = clamp(0.06 + agg * 0.085, 0.03, 0.22);
    primaryGain.gain.setValueAtTime(0.0001, now);
    primaryGain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
    primaryGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    primaryOsc.connect(primaryGain);
    primaryGain.connect(this.nodes.dcBlocker);
    if (this.nodes.reverbSend) primaryGain.connect(this.nodes.reverbSend);
    primaryOsc.start(now);
    primaryOsc.stop(now + decay + 0.08);

    const hasUpperPartial = record?.bradh === 'Y' || record?.inmate_status_code === 'DE';
    if (hasUpperPartial) {
      const partialOsc = ctx.createOscillator();
      const partialGain = ctx.createGain();
      const ratio = record?.bradh === 'Y' ? 2.5 : 1.5;
      const partialFreq = clamp(baseFreq * ratio, 165, 2200);
      const partialDecay = clamp(decay * 1.15, 0.55, 2.2);

      partialOsc.type = 'sine';
      partialOsc.frequency.setValueAtTime(partialFreq, now);

      partialGain.gain.setValueAtTime(0.0001, now);
      partialGain.gain.linearRampToValueAtTime(peakGain * 0.45, now + 0.03);
      partialGain.gain.exponentialRampToValueAtTime(0.0001, now + partialDecay);

      partialOsc.connect(partialGain);
      partialGain.connect(this.nodes.dcBlocker);
      if (this.nodes.reverbSend) partialGain.connect(this.nodes.reverbSend);
      partialOsc.start(now + 0.02);
      partialOsc.stop(now + partialDecay + 0.1);
    }
  }

  getWaveformData() {
    if (!this.analyser || !this._timeData) return null;
    this.analyser.getByteTimeDomainData(this._timeData);
    return this._timeData;
  }

  getSanctuaryWaveData() {
    if (!this.sanctuaryAnalyser || !this._sanctuaryTimeData) return null;
    this.sanctuaryAnalyser.getByteTimeDomainData(this._sanctuaryTimeData);
    return this._sanctuaryTimeData;
  }

  getFrequencyData() {
    if (!this.analyser || !this._freqData) return null;
    this.analyser.getByteFrequencyData(this._freqData);
    return this._freqData;
  }
}
