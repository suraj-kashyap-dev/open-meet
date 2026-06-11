'use client';

export type SoundName = 'join' | 'leave' | 'message' | 'knock' | 'reaction' | 'recording';

let audioCtx: AudioContext | null = null;

const fileCache = new Map<SoundName, AudioBuffer | null>();

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (audioCtx) {
    return audioCtx;
  }

  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Ctor) {
    return null;
  }

  audioCtx = new Ctor();

  return audioCtx;
}

async function tryLoadFile(ctx: AudioContext, name: SoundName): Promise<AudioBuffer | null> {
  if (fileCache.has(name)) {
    return fileCache.get(name) ?? null;
  }

  try {
    const res = await fetch(`/sounds/${name}.mp3`, { cache: 'force-cache' });

    if (!res.ok) {
      fileCache.set(name, null);

      return null;
    }

    const buf = await res.arrayBuffer();

    const decoded = await ctx.decodeAudioData(buf);

    fileCache.set(name, decoded);

    return decoded;
  } catch {
    fileCache.set(name, null);

    return null;
  }
}

function playBuffer(ctx: AudioContext, buf: AudioBuffer, volume: number): void {
  const src = ctx.createBufferSource();

  src.buffer = buf;

  const gain = ctx.createGain();

  gain.gain.value = volume;

  src.connect(gain).connect(ctx.destination);

  src.start();
}

interface ToneSpec {
  freq: number;
  startOffset: number;
  duration: number;
  endFreq?: number;
}

function playSynth(ctx: AudioContext, tones: ToneSpec[], volume: number): void {
  const now = ctx.currentTime;
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';

  filter.frequency.value = 3500;

  filter.Q.value = 0.6;

  filter.connect(ctx.destination);

  for (const tone of tones) {
    const osc = ctx.createOscillator();

    osc.type = 'sine';

    osc.frequency.setValueAtTime(tone.freq, now + tone.startOffset);

    if (tone.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        tone.endFreq,
        now + tone.startOffset + tone.duration,
      );
    }

    const env = ctx.createGain();
    const attack = 0.008;
    const release = tone.duration - attack;

    env.gain.setValueAtTime(0, now + tone.startOffset);

    env.gain.linearRampToValueAtTime(volume, now + tone.startOffset + attack);

    env.gain.exponentialRampToValueAtTime(0.0001, now + tone.startOffset + attack + release);

    osc.connect(env).connect(filter);

    osc.start(now + tone.startOffset);

    osc.stop(now + tone.startOffset + tone.duration + 0.02);
  }
}

const SYNTH_RECIPES: Record<SoundName, ToneSpec[]> = {
  join: [
    { freq: 523.25, startOffset: 0, duration: 0.18 },
    { freq: 659.25, startOffset: 0.09, duration: 0.22 },
  ],

  leave: [
    { freq: 587.33, startOffset: 0, duration: 0.18 },
    { freq: 440.0, startOffset: 0.09, duration: 0.22 },
  ],

  message: [{ freq: 880.0, startOffset: 0, duration: 0.16 }],

  knock: [
    { freq: 220.0, startOffset: 0, duration: 0.08 },
    { freq: 220.0, startOffset: 0.14, duration: 0.08 },
  ],

  reaction: [{ freq: 660.0, startOffset: 0, endFreq: 990.0, duration: 0.14 }],

  recording: [
    { freq: 660.0, startOffset: 0, duration: 0.14 },
    { freq: 880.0, startOffset: 0.16, duration: 0.18 },
  ],
};

export async function playSound(name: SoundName, volume: number = 0.08): Promise<void> {
  const ctx = ensureCtx();

  if (!ctx) {
    return;
  }

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const file = await tryLoadFile(ctx, name);

  if (file) {
    playBuffer(ctx, file, volume);

    return;
  }

  const recipe = SYNTH_RECIPES[name];

  playSynth(ctx, recipe, volume);
}
