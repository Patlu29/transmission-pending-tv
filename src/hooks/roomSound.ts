import type { EnvironmentId } from '@/scene/environments/contract';
import { useDisplayStore } from '@/state/displayStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { usePlayerStore } from '@/state/playerStore';
import { roomSoundAudible } from '@/state/roomSoundRule';
import { useSettingsStore } from '@/state/settingsStore';

/**
 * Optional room sound (V2-FR-37, design-spec v2 5.0): synthesised with Web Audio, no files, off by
 * default and started only by the viewer's action (the AudioContext is created inside that click).
 * It is audible only while the video is muted or nothing plays, and silent under Calm. Every change
 * eases over several seconds (envelopes of at least 1.5 s), nothing is sudden, and the loudest it
 * gets is about 24 dB below full scale.
 */
interface Ambience {
  /** Noise band: centre frequency, Q, and gain. */
  noiseHz: number;
  q: number;
  noise: number;
  type: BiquadFilterType;
  /** Optional low drone. */
  droneHz?: number;
  drone?: number;
  /** Slow swell on the noise (Hz, depth 0 to 1). */
  lfoHz: number;
  lfoDepth: number;
}

export const AMBIENCE: Record<EnvironmentId, Ambience> = {
  'tv-room': {
    noiseHz: 3000,
    q: 0.4,
    noise: 0.01,
    type: 'bandpass',
    droneHz: 50,
    drone: 0.05,
    lfoHz: 0.05,
    lfoDepth: 0.2,
  },
  'mountain-sky': {
    noiseHz: 500,
    q: 0.7,
    noise: 0.06,
    type: 'bandpass',
    lfoHz: 0.07,
    lfoDepth: 0.5,
  },
  cinema: {
    noiseHz: 180,
    q: 0.5,
    noise: 0.05,
    type: 'lowpass',
    droneHz: 60,
    drone: 0.03,
    lfoHz: 0.04,
    lfoDepth: 0.1,
  },
  'drive-in': {
    noiseHz: 5000,
    q: 0.5,
    noise: 0.012,
    type: 'highpass',
    droneHz: 90,
    drone: 0.02,
    lfoHz: 0.12,
    lfoDepth: 0.3,
  },
  'open-air': { noiseHz: 800, q: 0.6, noise: 0.04, type: 'bandpass', lfoHz: 0.09, lfoDepth: 0.4 },
  bedroom: { noiseHz: 1800, q: 0.3, noise: 0.07, type: 'highpass', lfoHz: 0.1, lfoDepth: 0.15 },
  'chai-stall': {
    noiseHz: 320,
    q: 0.5,
    noise: 0.05,
    type: 'bandpass',
    lfoHz: 0.25,
    lfoDepth: 0.35,
  },
  train: { noiseHz: 130, q: 0.5, noise: 0.09, type: 'lowpass', lfoHz: 1.2, lfoDepth: 0.15 },
  'space-deck': {
    noiseHz: 400,
    q: 0.5,
    noise: 0.004,
    type: 'lowpass',
    droneHz: 55,
    drone: 0.06,
    lfoHz: 0.03,
    lfoDepth: 0.1,
  },
};

const MASTER_MAX = 0.06;
const TIME_CONSTANT = 0.8; // about 2.4 s to settle

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  filter: BiquadFilterNode;
  noiseGain: GainNode;
  drone: OscillatorNode;
  droneGain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
}

let graph: Graph | null = null;

function build(): Graph | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  src.connect(filter).connect(noiseGain).connect(master);
  src.start();

  const drone = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  drone.connect(droneGain).connect(master);
  drone.start();

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0;
  lfo.connect(lfoGain).connect(noiseGain.gain);
  lfo.start();
  return { ctx, master, filter, noiseGain, drone, droneGain, lfo, lfoGain };
}

function ease(param: AudioParam, value: number, ctx: AudioContext) {
  param.cancelScheduledValues(ctx.currentTime);
  param.setTargetAtTime(value, ctx.currentTime, TIME_CONSTANT);
}

function apply() {
  const settings = useSettingsStore.getState();
  const player = usePlayerStore.getState();
  const audible = roomSoundAudible({
    on: settings.roomSound,
    calm: useDisplayStore.getState().reducedMotion,
    videoPlaying: player.phase === 'playing' || player.phase === 'loading',
    videoMuted: player.muted,
  });
  if (audible && !graph) graph = build();
  if (!graph) return;
  const g = graph;
  const a = AMBIENCE[useEnvironmentStore.getState().id];
  if (audible) void g.ctx.resume();
  ease(g.master.gain, audible ? MASTER_MAX : 0, g.ctx);
  g.filter.type = a.type;
  ease(g.filter.frequency, a.noiseHz, g.ctx);
  ease(g.filter.Q, a.q, g.ctx);
  ease(g.noiseGain.gain, a.noise * (1 - a.lfoDepth * 0.5), g.ctx);
  g.lfo.frequency.value = a.lfoHz;
  ease(g.lfoGain.gain, a.noise * a.lfoDepth * 0.5, g.ctx);
  g.drone.frequency.value = a.droneHz ?? 50;
  ease(g.droneGain.gain, a.drone ?? 0, g.ctx);
}

export function startRoomSound(): () => void {
  const unsubs = [
    useSettingsStore.subscribe(apply),
    usePlayerStore.subscribe(apply),
    useEnvironmentStore.subscribe(apply),
    useDisplayStore.subscribe(apply),
  ];
  return () => {
    unsubs.forEach((u) => u());
    if (graph) void graph.ctx.suspend();
  };
}
