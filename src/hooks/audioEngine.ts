import { useDisplayStore } from '@/state/displayStore';
import { useHauntStore } from '@/state/hauntStore';
import { isPoweredStatus, useIntroStore, type IntroStatus } from '@/state/introStore';

/**
 * Optional period audio (FR-22), synthesised with Web Audio: a mains hum, a
 * little filtered static and a click on power. No files, no licences. Off by
 * default; the AudioContext is only created inside the unmute action.
 */
interface Engine {
  ctx: AudioContext;
  master: GainNode;
  hum: GainNode;
  hiss: GainNode;
  noise: AudioBuffer;
}

let engine: Engine | null = null;

function create(): Engine | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const hum = ctx.createGain();
  hum.gain.value = 0;
  hum.connect(master);
  for (const [freq, level] of [
    [50, 0.5],
    [100, 0.25],
  ] as const) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;
    g.gain.value = level;
    osc.connect(g).connect(hum);
    osc.start();
  }

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const hiss = ctx.createGain();
  hiss.gain.value = 0;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2500;
  band.Q.value = 0.5;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.connect(band).connect(hiss).connect(master);
  src.start();
  hiss.connect(master);
  return { ctx, master, hum, hiss, noise };
}

function ramp(param: AudioParam, value: number, seconds: number, ctx: AudioContext) {
  param.cancelScheduledValues(ctx.currentTime);
  param.setTargetAtTime(value, ctx.currentTime, seconds / 3);
}

function click(e: Engine) {
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0.5, e.ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, e.ctx.currentTime + 0.05);
  src.connect(g).connect(e.master);
  src.start(e.ctx.currentTime, Math.random());
  src.stop(e.ctx.currentTime + 0.06);
}

function applyStatus(status: IntroStatus, previous: IntroStatus | null) {
  if (!engine) return;
  const powered = isPoweredStatus(status);
  ramp(engine.hum.gain, powered ? 0.05 : 0, 0.4, engine.ctx);
  ramp(
    engine.hiss.gain,
    status === 'warming' ? 0.05 : status === 'playing' ? 0.008 : 0,
    0.5,
    engine.ctx,
  );
  if (previous !== null && powered !== isPoweredStatus(previous)) click(engine);
}

export function startAudioEngine(): () => void {
  let prevAudio = useDisplayStore.getState().audio;
  let prevStatus: IntroStatus | null = null;
  let suspendTimer: ReturnType<typeof setTimeout> | undefined;

  const onDisplay = () => {
    const { audio } = useDisplayStore.getState();
    if (audio === prevAudio) return;
    prevAudio = audio;
    clearTimeout(suspendTimer);
    if (audio === 'on') {
      engine ??= create();
      if (!engine) return;
      void engine.ctx.resume();
      ramp(engine.master.gain, 0.6, 0.15, engine.ctx);
      applyStatus(useIntroStore.getState().status, null);
    } else if (engine) {
      const e = engine;
      ramp(e.master.gain, 0, 0.15, e.ctx);
      suspendTimer = setTimeout(() => void e.ctx.suspend(), 400);
    }
  };
  const onIntro = () => {
    const { status } = useIntroStore.getState();
    if (status === prevStatus) return;
    const was = prevStatus;
    prevStatus = status;
    if (useDisplayStore.getState().audio === 'on') applyStatus(status, was);
  };
  prevStatus = useIntroStore.getState().status;
  let lastHum = 0;
  const onHaunt = () => {
    const { hum } = useHauntStore.getState();
    if (Math.abs(hum - lastHum) < 0.01 || useDisplayStore.getState().audio !== 'on') return;
    lastHum = hum;
    applyStatus(useIntroStore.getState().status, useIntroStore.getState().status);
  };
  const unsubs = [
    useDisplayStore.subscribe(onDisplay),
    useIntroStore.subscribe(onIntro),
    useHauntStore.subscribe(onHaunt),
  ];
  return () => {
    unsubs.forEach((u) => u());
    clearTimeout(suspendTimer);
  };
}
