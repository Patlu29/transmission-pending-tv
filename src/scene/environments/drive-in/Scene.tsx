import { useThree } from '@react-three/fiber';
import type { EnvironmentSceneProps } from '../contract.ts';
import { ScreenAnchor } from '../ScreenAnchor.tsx';
import { Block } from '../shared/Block.tsx';
import { useRoomClock } from '../shared/clock.ts';
import { GradientSky, Stars } from '../shared/Sky.tsx';
import { SpillLight } from '../shared/SpillLight.tsx';
import { SpriteField } from '../shared/SpriteField.tsx';
import { ViewFrame, ViewPlaced } from '../shared/ViewPlaced.tsx';
import environment from './index.tsx';

const spec = environment.screen;
const H = spec.widthM / spec.aspect;
const ANCHOR_Y = 12;

/** A car at the drive-in at night. The windscreen is open air: no glass, smudge or reflection is drawn. */
export default function DriveInScene({ calm }: EnvironmentSceneProps) {
  const clock = useRoomClock(calm);
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());
  return (
    <>
      <GradientSky
        horizon="#1a2442"
        glow="#2a3156"
        mid="#0f1830"
        zenith="#0b1226"
        below="#1a1c22"
        glowAt={0.02}
        glowWidth={0.12}
      />
      <Stars clock={clock} count={80} pixelRatio={pixelRatio} />
      <ambientLight intensity={0.5} color="#9aa6c8" />
      <SpillLight
        clock={clock}
        calm={calm}
        base={60}
        position={[0, 4, 18]}
        color="#dfe6ff"
        distance={60}
      />

      <ScreenAnchor spec={spec} position={[0, ANCHOR_Y, 0]} />
      {/* screen tower and frame */}
      <Block
        name="tower-frame"
        position={[0, ANCHOR_Y, -0.4]}
        size={[spec.widthM + 1.6, H + 1.6, 0.5]}
        color="#2a2f3a"
        screenOwned
      />
      <Block
        name="tower-leg-l"
        position={[-5, ANCHOR_Y / 2 - 0.4, -0.7]}
        size={[0.9, ANCHOR_Y, 0.6]}
        color="#2a2f3a"
        halo={false}
      />
      <Block
        name="tower-leg-r"
        position={[5, ANCHOR_Y / 2 - 0.4, -0.7]}
        size={[0.9, ANCHOR_Y, 0.6]}
        color="#2a2f3a"
        halo={false}
      />
      <Block
        name="lot"
        position={[0, -0.1, 10]}
        size={[300, 0.2, 400]}
        color="#1a1c22"
        halo={false}
      />
      {/* snack bar glow and light poles to one side */}
      <Block
        name="snack-bar"
        position={[-26, 2, 6]}
        size={[8, 4, 5]}
        color="#3a3328"
        glow="#e8c26a"
        glowIntensity={0.5}
        halo={false}
      />
      {[-18, 22].map((x) => (
        <group key={x}>
          <Block
            name={`pole-${x}`}
            position={[x, 5, 4]}
            size={[0.25, 10, 0.25]}
            color="#14161a"
            halo={false}
          />
          <Block
            name={`pole-lamp-${x}`}
            position={[x, 10, 4]}
            size={[0.8, 0.3, 0.5]}
            color="#ffe2a0"
            glow="#ffe2a0"
            glowIntensity={1.4}
            halo={false}
          />
        </group>
      ))}
      {!calm && (
        <SpriteField
          clock={clock}
          count={6}
          seed={14}
          min={[-20, 8.2, 3]}
          max={[-16, 11.5, 5]}
          velocity={[0.2, 0.3, 0]}
          size={[0.12, 0.2]}
          kind="dot"
          colorA="#ffe9b0"
          alpha={0.8}
          keepOut
          twinkle={{ hz: 0.8, amp: 0.1 }}
        />
      )}

      {/* the car: dash, wheel and A-pillars, in view space */}
      <ViewFrame>
        <ViewPlaced x={0.5} y={1.0} depth={1.2}>
          <Block name="dashboard" size={[3.2, 0.34, 0.5]} color="#14161a" />
        </ViewPlaced>
        <ViewPlaced x={0.5} y={0.93} depth={1.3}>
          <Block
            name="dial-glow"
            size={[0.5, 0.02, 0.02]}
            color="#ffb347"
            glow="#ffb347"
            glowIntensity={1.4}
          />
        </ViewPlaced>
        <ViewPlaced x={0.36} y={1.0} depth={1.0}>
          <mesh name="steering-wheel" rotation={[-1.1, 0, 0]} userData={{ halo: true }}>
            <torusGeometry args={[0.17, 0.016, 8, 24]} />
            <meshStandardMaterial color="#14161a" roughness={0.7} />
          </mesh>
        </ViewPlaced>
        <ViewPlaced x={0.0} y={0.5} depth={1.2}>
          <Block
            name="a-pillar-l"
            size={[0.22, 2.6, 0.3]}
            color="#0b0c10"
            rotation={[0, 0, -0.12]}
          />
        </ViewPlaced>
        <ViewPlaced x={1.0} y={0.5} depth={1.2}>
          <Block
            name="a-pillar-r"
            size={[0.22, 2.6, 0.3]}
            color="#0b0c10"
            rotation={[0, 0, 0.12]}
          />
        </ViewPlaced>
        {/* parked car roofs on the lot, below the screen, clear of the halo */}
        {[0.12, 0.3, 0.74, 0.9].map((x, i) => (
          <ViewPlaced key={x} x={x} y={0.86} depth={16 + (i % 2) * 4}>
            <Block name={`car-roof-${i}`} size={[2.2, 0.5, 4]} color="#101218" />
          </ViewPlaced>
        ))}
      </ViewFrame>
    </>
  );
}
