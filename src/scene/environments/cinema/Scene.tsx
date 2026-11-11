import { useEffect, useMemo, useRef } from 'react';
import { Matrix4, type InstancedMesh } from 'three';
import type { EnvironmentSceneProps } from '../contract.ts';
import { ScreenAnchor } from '../ScreenAnchor.tsx';
import { Block } from '../shared/Block.tsx';
import { useRoomClock } from '../shared/clock.ts';
import { SpillLight } from '../shared/SpillLight.tsx';
import { SpriteField } from '../shared/SpriteField.tsx';
import { ViewFrame, ViewPlaced } from '../shared/ViewPlaced.tsx';
import { useViewWidth } from '../shared/viewContext.ts';
import environment from './index.tsx';

const spec = environment.screen;
const H = spec.widthM / spec.aspect;
const ANCHOR_Y = 3.4;

/** Rows of seat backs, one instanced draw call (80 seats), in the lower foreground of the view. */
function Seats() {
  const w = useViewWidth(5);
  const ref = useRef<InstancedMesh>(null);
  const COLS = 20;
  const ROWS = 4;
  const seatW = (w * 1.1) / COLS;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new Matrix4();
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const rise = 0.04 * Math.abs(Math.sin(c * 1.3 + r));
        mat.makeTranslation((c - (COLS - 1) / 2) * seatW, -r * 0.0 + rise - r * 0.0, -r * 0.6);
        m.setMatrixAt(i++, mat);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [seatW]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, COLS * ROWS]}
      name="seats"
      userData={{ halo: true }}
      frustumCulled={false}
    >
      <boxGeometry args={[seatW * 0.86, 0.5, 0.18]} />
      <meshStandardMaterial color="#6e1f2b" roughness={1} />
    </instancedMesh>
  );
}

/** Empty single-screen auditorium. The projector beam stays above the proscenium top. */
export default function CinemaScene({ calm }: EnvironmentSceneProps) {
  const clock = useRoomClock(calm);
  const curtainFolds = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);
  const pw = spec.widthM;
  return (
    <>
      <color attach="background" args={['#0a0709']} />
      <ambientLight intensity={1.4} color="#d9c9c0" />
      <SpillLight
        clock={clock}
        calm={calm}
        base={4.2}
        position={[0, 1.0, 6]}
        color="#ffe9c9"
        distance={20}
      />

      <ScreenAnchor spec={spec} position={[0, ANCHOR_Y, 0]} />
      <Block
        name="back-wall"
        position={[0, 4, -0.5]}
        size={[40, 16, 0.2]}
        color="#1c1418"
        halo={false}
      />
      {/* proscenium: gold trim around the black surround (screen-owned) */}
      <Block
        name="proscenium-top"
        position={[0, ANCHOR_Y + H / 2 + 0.55, -0.1]}
        size={[pw + 3.2, 0.5, 0.3]}
        color="#b08d4a"
        screenOwned
      />
      <Block
        name="surround"
        position={[0, ANCHOR_Y, -0.12]}
        size={[pw + 0.5, H + 0.5, 0.05]}
        color="#050505"
        screenOwned
      />
      {/* curtains at left and right, with folds */}
      {[-1, 1].map((side) =>
        curtainFolds.map((i) => (
          <Block
            key={`${side}${i}`}
            name={`curtain-${side}-${i}`}
            position={[side * (pw / 2 + 1.1 + i * 0.22), ANCHOR_Y + 0.2, 0.05 + 0.05 * (i % 2)]}
            size={[0.24, H + 2.2, 0.2]}
            color={i % 2 ? '#4a1620' : '#3a0f18'}
          />
        )),
      )}
      {/* wall sconces down the sides */}
      {[-1, 1].flatMap((side) =>
        [0, 1, 2].map((i) => (
          <Block
            key={`${side}${i}`}
            name={`sconce-${side}-${i}`}
            position={[side * 13, 3 - i * 0.2, 0 - i * 3]}
            size={[0.15, 0.3, 0.1]}
            color="#ffcf80"
            glow="#ffcf80"
            glowIntensity={1.1}
          />
        )),
      )}
      <Block
        name="exit-sign"
        position={[-7.4, 5.2, 0.2]}
        size={[0.8, 0.28, 0.05]}
        color="#3ca35c"
        glow="#3ca35c"
        glowIntensity={1}
      />
      {/* the beam: a faint additive slab above the proscenium top only, ending at the ceiling line */}
      <mesh
        name="beam"
        position={[0, ANCHOR_Y + H / 2 + 3.2, 4]}
        rotation={[0.12, 0, 0]}
        userData={{ halo: true }}
      >
        <boxGeometry args={[1.2, 0.5, 12]} />
        <meshBasicMaterial
          color="#ffe9c9"
          transparent
          opacity={0.05}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {!calm && (
        <SpriteField
          clock={clock}
          count={30}
          seed={8}
          min={[-1, ANCHOR_Y + H / 2 + 1.0, -1]}
          max={[1, ANCHOR_Y + H / 2 + 2.6, 10]}
          velocity={[0.01, 0.02, 0]}
          size={[0.03, 0.06]}
          kind="dot"
          colorA="#fff2d8"
          alpha={0.6}
          keepOut
        />
      )}

      <ViewFrame>
        <ViewPlaced x={0.5} y={0.97} depth={5}>
          <Seats />
        </ViewPlaced>
        <ViewPlaced x={0.06} y={0.92} depth={4.6}>
          <Block name="head-l" size={[0.34, 0.42, 0.2]} color="#0a0709" unlit sweep={0.02} />
        </ViewPlaced>
        <ViewPlaced x={0.94} y={0.94} depth={4.6}>
          <Block name="head-r" size={[0.34, 0.42, 0.2]} color="#0a0709" unlit sweep={0.02} />
        </ViewPlaced>
      </ViewFrame>
    </>
  );
}
