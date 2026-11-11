import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { EnvironmentSceneProps } from '../contract.ts';
import { ScreenAnchor } from '../ScreenAnchor.tsx';
import { Block } from '../shared/Block.tsx';
import { useRoomClock } from '../shared/clock.ts';
import { SpillLight } from '../shared/SpillLight.tsx';
import { SpriteField } from '../shared/SpriteField.tsx';
import { ViewFrame, ViewPlaced } from '../shared/ViewPlaced.tsx';
import environment from './index.tsx';

const spec = environment.screen;
const ANCHOR_Y = 2.5;
const CLOTHES = ['#c28b2c', '#e8e6df', '#7a2630', '#2e3f7a'];

function Bulb({ x, calm, clock }: { x: number; calm: boolean; clock: { current: { t: number } } }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    if (g.current)
      g.current.rotation.z = calm
        ? 0
        : ((2 * Math.PI) / 180) * Math.sin((2 * Math.PI * clock.current.t) / 5);
  });
  return (
    <group ref={g} position={[x, 3.2, 0.3]}>
      <Block
        name={`bulb-${x}`}
        position={[0, -0.35, 0]}
        size={[0.1, 0.14, 0.1]}
        color="#ffcf70"
        glow="#ffcf70"
        glowIntensity={1.6}
        sweep={0.04}
      />
      <Block
        name={`bulb-cord-${x}`}
        position={[0, -0.1, 0]}
        size={[0.01, 0.5, 0.01]}
        color="#14161a"
        sweep={0.04}
      />
    </group>
  );
}

/**
 * Chai stall: a counter, two bulbs, a small TV on a bracket and a crowd of flat silhouettes placed in VIEW space
 * (lower foreground and the sides), never in front of the screen. PLACEHOLDER art: boxes stand in for the crowd
 * and prop atlas; the technical-artist's instanced sprites replace them.
 */
export default function ChaiStallScene({ calm }: EnvironmentSceneProps) {
  const clock = useRoomClock(calm);
  return (
    <>
      <color attach="background" args={['#0c1020']} />
      <ambientLight intensity={0.45} color="#a8aec8" />
      <SpillLight
        clock={clock}
        calm={calm}
        base={2.6}
        position={[0, 1.8, 1.2]}
        color="#a9c3e8"
        distance={8}
      />
      <pointLight
        position={[-0.6, 3.0, 0.6]}
        intensity={5}
        color="#ffcf70"
        distance={9}
        decay={2}
      />

      <ScreenAnchor spec={spec} position={[0, ANCHOR_Y, 0]} />
      <Block
        name="stall-front"
        position={[0, 2.2, -0.08]}
        size={[3.4, 2.4, 0.1]}
        color="#2f5f7a"
        halo={false}
      />
      <Block name="roof" position={[0, 3.75, 0.2]} size={[3.8, 0.12, 1.2]} color="#6b5a4a" />
      <Block
        name="brick"
        position={[-3.2, 2, -0.3]}
        size={[3, 4.5, 0.2]}
        color="#8a4b3a"
        halo={false}
      />
      <Block
        name="bracket"
        position={[0, ANCHOR_Y - 0.55, -0.05]}
        size={[0.5, 0.05, 0.05]}
        color="#14161a"
        screenOwned
      />
      <Block name="counter" position={[0, 1.15, 0.3]} size={[3.2, 0.9, 0.7]} color="#2f5f7a" />
      <Block
        name="kettle"
        position={[-0.9, 1.78, 0.35]}
        size={[0.28, 0.35, 0.28]}
        color="#b8bcc2"
      />
      {[0.1, 0.25, 0.4].map((x) => (
        <Block
          key={x}
          name={`glass-${x}`}
          position={[x + 0.5, 1.68, 0.4]}
          size={[0.07, 0.12, 0.07]}
          color="#c7a15a"
        />
      ))}
      <Block
        name="chai-sign"
        position={[1.25, 3.1, 0.1]}
        size={[0.9, 0.35, 0.04]}
        color="#d9d2c0"
      />
      <Bulb x={-1.1} calm={calm} clock={clock} />
      <Bulb x={1.4} calm={calm} clock={clock} />
      <Block name="bike" position={[-2.0, 0.55, 0.9]} size={[0.15, 1.1, 1.3]} color="#14161a" />
      {!calm && (
        <SpriteField
          clock={clock}
          count={8}
          seed={33}
          min={[-0.95, 1.9, 0.3]}
          max={[-0.8, 2.7, 0.5]}
          velocity={[0, 0.1, 0]}
          size={[0.1, 0.16]}
          kind="steam"
          colorA="#e6eaf2"
          alpha={0.35}
          keepOut
          aspect={2.2}
        />
      )}

      {/* crowd: view-space silhouettes in the lower band and at the sides (head tops well clear of the rect) */}
      <ViewFrame>
        {[0.04, 0.12, 0.2, 0.8, 0.88, 0.96].map((x, i) => (
          <ViewPlaced key={x} x={x} y={0.9 + (i % 3) * 0.03} depth={0.95 + (i % 2) * 0.2}>
            <Block
              name={`crowd-${i}`}
              size={[0.2, 0.55 + (i % 3) * 0.05, 0.08]}
              color={CLOTHES[i % 4]!}
              sweep={calm ? 0 : 0.01}
            />
          </ViewPlaced>
        ))}
        <ViewPlaced x={0.5} y={1.0} depth={0.9}>
          <Block name="stools" size={[0.5, 0.3, 0.3]} color="#2f5f7a" />
        </ViewPlaced>
      </ViewFrame>
    </>
  );
}
