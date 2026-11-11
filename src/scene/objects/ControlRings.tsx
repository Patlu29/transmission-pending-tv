/* eslint-disable react-hooks/immutability, react-hooks/refs -- R3F objects (materials, nodes, refs) are mutated imperatively by design */
import { Html } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Box3, BackSide, Mesh, MeshBasicMaterial, Vector3, type Object3D } from 'three';
import { publishSceneTest } from '../integration/testHook';
import { getIsLive, isLastDiaryPage, stepChannel, useIsLive } from '../environments/seam.ts';
import { easeCamera } from '../cameras/poses';
import { readHaunt, useDisplayStore, useHauntStore, useIntroStore } from '../integration/stores';

type KnobId = 'power' | 'channel' | 'volume';
const NODE: Record<KnobId, string> = {
  power: 'knob-power',
  channel: 'knob-channel',
  volume: 'knob-volume',
};
const IDS = Object.keys(NODE) as KnobId[];
const OUTLINE_MS = 100; // full strength within 100 ms (spec 4.3)
const KNOB_TURN = (40 * Math.PI) / 180; // power knob turns 40 degrees
const KNOB_TURN_MS = 150;
const HULL = 0.004;
const HAUNT_OVERSHOOT_DEG = 1;

interface KnobTurn {
  from: number; // degrees applied at the start
  to: number; // degrees at rest after the turn
  elapsed: number;
  dur: number; // seconds
}

function idFromObject(obj: Object3D | null): KnobId | null {
  for (let o = obj; o; o = o.parent) {
    const id = IDS.find((k) => NODE[k] === o!.name);
    if (id) return id;
  }
  return null;
}

/**
 * Wraps the Holo display (was KnobLayer). The rings are `knob-channel` (outer) and `knob-volume` (inner), the power
 * dimple is `knob-power`; the node names are unchanged. Wraps the display model. Finds the knob nodes by name, handles hover and click,
 * draws an inverted-hull outline (no post-processing), shows an anchored DOM tag,
 * and turns the power knob. Works for the placeholder body and the real glTF alike
 * as long as the nodes are named `knob-power`, `knob-channel` and `knob-volume`.
 */
export function ControlRings({ children }: { children: ReactNode }) {
  const root = useRef<Object3D>(null);
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);
  const [hovered, setHovered] = useState<KnobId | null>(null);
  const nodes = useRef<Partial<Record<KnobId, Object3D>>>({});
  const anchors = useRef<Partial<Record<KnobId, Vector3>>>({});
  const hullMats = useMemo(
    () =>
      Object.fromEntries(
        IDS.map((id) => {
          const m = new MeshBasicMaterial({
            color: '#f5f5f5', // --grey-1000
            side: BackSide,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            toneMapped: false,
          });
          m.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
               transformed += normalize(normal) * ${HULL.toFixed(4)};`,
            );
          };
          return [id, m];
        }),
      ) as Record<KnobId, MeshBasicMaterial>,
    [],
  );
  const hullMeshes = useRef<Mesh[]>([]);
  const turn = useRef(0);
  // Haunted turns (design-spec 16.6.2): accumulated degrees per knob, plus the running turn.
  const hauntDeg = useRef<Record<'channel' | 'volume', number>>({ channel: 0, volume: 0 });
  const hauntTurn = useRef<Partial<Record<'channel' | 'volume', KnobTurn>>>({});
  const baseZ = useRef<Partial<Record<KnobId, number>>>({});
  const hoveredRef = useRef<KnobId | null>(null);
  const [, setReady] = useState(0);

  useEffect(() => {
    // Degrees clockwise seen from the front (0 at rest).
    const deg = (id: KnobId) => (-(nodes.current[id]?.rotation.z ?? 0) * 180) / Math.PI;
    const angles = () => ({
      power: deg('power') - (-(baseZ.current.power ?? 0) * 180) / Math.PI,
      channel: deg('channel') - (-(baseZ.current.channel ?? 0) * 180) / Math.PI,
      volume: deg('volume') - (-(baseZ.current.volume ?? 0) * 180) / Math.PI,
    });
    // `knobAngles` is the pre-2050 name, kept as an alias for one release.
    publishSceneTest({ ringAngles: angles, knobAngles: angles });
  }, []);

  // Locate knob nodes, attach hull meshes and compute tag anchors.
  useEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    for (const id of IDS) {
      const node = group.getObjectByName(NODE[id]);
      if (!node) continue;
      nodes.current[id] = node;
      baseZ.current[id] = node.rotation.z;
      const box = new Box3().setFromObject(node);
      const c = box.getCenter(new Vector3());
      c.x = box.max.x; // anchor on the knob's right edge
      anchors.current[id] = group.worldToLocal(c);
      node.traverse((o) => {
        if (!(o as Mesh).isMesh || o.userData.isHull) return;
        const hull = new Mesh((o as Mesh).geometry, hullMats[id]); // geometry is shared, not owned
        hull.userData.isHull = true;
        hull.raycast = () => {}; // never picked
        hull.renderOrder = 2;
        o.add(hull);
        hullMeshes.current.push(hull);
      });
    }
    setReady((n) => n + 1);
    return () => {
      hullMeshes.current.forEach((h) => h.removeFromParent());
      hullMeshes.current = [];
      nodes.current = {};
    };
  }, [hullMats]);

  useEffect(() => () => Object.values(hullMats).forEach((m) => m.dispose()), [hullMats]);

  useEffect(() => {
    hoveredRef.current = hovered;
    scene.userData.hoveringKnob = hovered !== null;
    document.body.style.cursor = hovered ? 'pointer' : '';
    invalidate();
    return () => {
      scene.userData.hoveringKnob = false;
      document.body.style.cursor = '';
    };
  }, [hovered, scene, invalidate]);

  // Knob cues from the story. Never while the pointer is over that knob; none under Calm.
  useEffect(() => {
    let lastNonce = useHauntStore.getState().knobCue?.nonce ?? 0;
    const unsub = useHauntStore.subscribe(() => {
      const cue = readHaunt().knobCue;
      if (!cue || cue.nonce === lastNonce) return;
      lastNonce = cue.nonce;
      if (hoveredRef.current === cue.which || !nodes.current[cue.which]) return;
      const from = hauntDeg.current[cue.which];
      const to = from + cue.deg;
      hauntDeg.current[cue.which] = to; // the knob stays where it ends
      hauntTurn.current[cue.which] = {
        from,
        to,
        elapsed: 0,
        dur: Math.max(2, cue.dur),
      };
      invalidate();
    });
    return unsub;
  }, [invalidate]);

  useFrame((_, delta) => {
    const reduced = useDisplayStore.getState().motion === 'reduced';
    let moving = false;
    // outline fade
    for (const id of IDS) {
      const m = hullMats[id];
      const target = hovered === id ? 1 : 0;
      const step = reduced ? 1 : delta / (OUTLINE_MS / 1000);
      const next =
        m.opacity + Math.sign(target - m.opacity) * Math.min(step, Math.abs(target - m.opacity));
      if (next !== m.opacity) moving = true;
      m.opacity = next;
    }
    // power knob turn
    const s = useIntroStore.getState().status;
    const on = s === 'warming' || s === 'playing' || s === 'ended';
    const goal = on ? KNOB_TURN : 0;
    const stepA = reduced ? KNOB_TURN : (KNOB_TURN * delta) / (KNOB_TURN_MS / 1000);
    const nextA =
      turn.current +
      Math.sign(goal - turn.current) * Math.min(stepA, Math.abs(goal - turn.current));
    if (nextA !== turn.current) {
      turn.current = nextA;
      const knob = nodes.current.power;
      if (knob) knob.rotation.z = -nextA; // clockwise from the front
      moving = true;
    }

    // Haunted turns. Power-off (or Calm) returns both knobs to rest at once.
    const poweredNow = on && !reduced;
    for (const which of ['channel', 'volume'] as const) {
      const node = nodes.current[which];
      if (!node) continue;
      const base = baseZ.current[which] ?? 0;
      const t = hauntTurn.current[which];
      if (!poweredNow) {
        if (t || hauntDeg.current[which] !== 0) {
          hauntTurn.current[which] = undefined;
          hauntDeg.current[which] = 0;
          node.rotation.z = base;
          moving = true;
        }
        continue;
      }
      if (!t) continue;
      t.elapsed += Math.min(delta, 0.1);
      const u = Math.min(1, t.elapsed / t.dur);
      const span = t.to - t.from;
      const sign = Math.sign(span) || 1;
      let deg: number;
      if (u < 0.85) deg = t.from + easeCamera(u / 0.85) * (span + sign * HAUNT_OVERSHOOT_DEG);
      else {
        const k = (u - 0.85) / 0.15;
        deg = t.to + sign * HAUNT_OVERSHOOT_DEG * (1 - k * k * (3 - 2 * k));
      }
      node.rotation.z = base - (deg * Math.PI) / 180;
      moving = true;
      if (u >= 1) hauntTurn.current[which] = undefined;
    }
    if (moving) invalidate();
  });

  const motion = useDisplayStore((s) => s.motion);
  const status = useIntroStore((s) => s.status);
  const live = useIsLive();
  const channelLocked = !live && status === 'playing' && motion === 'full';
  const tagText: Record<KnobId, string> = {
    power: 'Power',
    channel: channelLocked ? 'Channel (after the show)' : 'Channel',
    volume: 'Sound',
  };

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    const id = idFromObject(e.object);
    if (id) e.stopPropagation();
    setHovered(id);
  };
  const lastWheel = useRef(0);
  const onWheel = (e: ThreeEvent<WheelEvent>) => {
    if (idFromObject(e.object) !== 'channel') return;
    const status = useIntroStore.getState().status;
    if (!getIsLive() && status !== 'ended') return; // channel 0 keeps v1 behaviour until the diary
    e.stopPropagation();
    const now = performance.now();
    if (now - lastWheel.current < 250) return; // one step per wheel burst
    lastWheel.current = now;
    if (e.deltaY > 0) stepChannel(1);
    else if (e.deltaY < 0) stepChannel(-1);
  };
  const onOut = () => setHovered(null);
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const id = idFromObject(e.object);
    if (!id) return;
    e.stopPropagation();
    const intro = useIntroStore.getState();
    const display = useDisplayStore.getState();
    if (id === 'power') {
      if (intro.status !== 'loading') intro.power(); // same action as the Switch on key
    } else if (id === 'channel') {
      if (getIsLive()) {
        // Live channel: click next, Shift-click previous (design-spec-v2 section 3).
        stepChannel((e.nativeEvent as MouseEvent).shiftKey ? -1 : 1);
      } else if (intro.status === 'ended' && isLastDiaryPage()) {
        stepChannel(1); // the diary's last page hands over to channel 1
      } else {
        const manual = intro.status === 'ended' || display.motion === 'reduced';
        if (manual && intro.status !== 'off' && intro.status !== 'loading') intro.nextPage();
      }
    } else {
      display.toggleAudio();
    }
  };

  const anchor = hovered ? anchors.current[hovered] : undefined;
  return (
    <group
      ref={root}
      onPointerOver={onOver}
      onPointerOut={onOut}
      onClick={onClick}
      onWheel={onWheel}
    >
      {children}
      {hovered && anchor && (
        <Html
          position={anchor}
          occlude="raycast"
          zIndexRange={[5, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            aria-hidden="true"
            style={{
              marginLeft: 14,
              padding: '2px 8px',
              whiteSpace: 'nowrap',
              background: '#141414',
              color: '#f5f5f5',
              border: '1px solid #8c8c8c',
              font: '600 14px/1.3 var(--font-display, sans-serif)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {tagText[hovered]}
          </div>
        </Html>
      )}
    </group>
  );
}
