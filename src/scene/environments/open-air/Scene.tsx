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
const ANCHOR_Y = 4.4;
const BEANBAGS = ['#b24a3a', '#3f6f8a', '#c9a24a'];

/** A rigged screen on poles in a field at night. */
export default function OpenAirScene({ calm }: EnvironmentSceneProps) {
  const clock = useRoomClock(calm);
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());
  const bulbs = Array.from({ length: 10 }, (_, i) => i);
  return (
    <>
      <GradientSky
        horizon="#3a2b4a"
        glow="#3a2b4a"
        mid="#16203c"
        zenith="#101830"
        below="#20301f"
        glowAt={0.02}
        glowWidth={0.1}
      />
      <Stars clock={clock} count={100} pixelRatio={pixelRatio} amp={0.08} />
      <ambientLight intensity={0.5} color="#a8b4d8" />
      <SpillLight
        clock={clock}
        calm={calm}
        base={14}
        position={[0, 1.5, 9]}
        color="#f2f4ff"
        distance={30}
      />

      <ScreenAnchor spec={spec} position={[0, ANCHOR_Y, 0]} />
      {/* black truss with a 0.15 m border around the screen (screen-owned) */}
      <Block
        name="truss-top"
        position={[0, ANCHOR_Y + H / 2 + 0.075, -0.1]}
        size={[spec.widthM + 0.6, 0.15, 0.2]}
        color="#0a0a0a"
        screenOwned
      />
      <Block
        name="truss-bottom"
        position={[0, ANCHOR_Y - H / 2 - 0.075, -0.1]}
        size={[spec.widthM + 0.6, 0.15, 0.2]}
        color="#0a0a0a"
        screenOwned
      />
      <Block
        name="truss-left"
        position={[-spec.widthM / 2 - 0.075, ANCHOR_Y, -0.1]}
        size={[0.15, H, 0.2]}
        color="#0a0a0a"
        screenOwned
      />
      <Block
        name="truss-right"
        position={[spec.widthM / 2 + 0.075, ANCHOR_Y, -0.1]}
        size={[0.15, H, 0.2]}
        color="#0a0a0a"
        screenOwned
      />
      <Block
        name="pole-l"
        position={[-5.6, ANCHOR_Y, -0.1]}
        size={[0.18, ANCHOR_Y * 2, 0.18]}
        color="#0a0a0a"
      />
      <Block
        name="pole-r"
        position={[5.6, ANCHOR_Y, -0.1]}
        size={[0.18, ANCHOR_Y * 2, 0.18]}
        color="#0a0a0a"
      />
      <Block
        name="grass"
        position={[0, -0.05, 0]}
        size={[200, 0.1, 160]}
        color="#20301f"
        halo={false}
      />
      {/* string lights: sagging lines on the left and right poles, bulbs steady */}
      {[-1, 1].flatMap((side) =>
        bulbs.map((i) => (
          <Block
            key={`${side}${i}`}
            name={`bulb-${side}-${i}`}
            position={[
              side * (5.6 + i * 0.7),
              6.6 - 0.9 * Math.sin((i / 9) * Math.PI),
              -0.4 - i * 0.6,
            ]}
            size={[0.12, 0.12, 0.12]}
            color="#ffd9a0"
            glow="#ffd9a0"
            glowIntensity={1.4}
            sweep={calm ? 0 : 0.12}
          />
        )),
      )}
      {/* tree silhouettes on the horizon, a moon */}
      {Array.from({ length: 16 }, (_, i) => (
        <Block
          key={i}
          name={`tree-${i}`}
          position={[-60 + i * 8, 4 + (i % 3), -45]}
          size={[3 + (i % 4), 8 + (i % 3) * 2, 2]}
          color="#0b1220"
          halo={false}
        />
      ))}
      <mesh name="moon" position={[-24, 26, -80]}>
        <sphereGeometry args={[3, 16, 12]} />
        <meshBasicMaterial color="#e9ecf2" toneMapped={false} />
      </mesh>
      {!calm && (
        <SpriteField
          clock={clock}
          count={6}
          seed={21}
          min={[-14, 0.8, -4]}
          max={[-7, 4, 4]}
          velocity={[0.1, 0.05, 0.04]}
          size={[0.1, 0.16]}
          kind="dot"
          colorA="#f4f7a0"
          alpha={0.9}
          keepOut
          twinkle={{ hz: 0.6, amp: 0.08 }}
        />
      )}
      {!calm && (
        <SpriteField
          clock={clock}
          count={6}
          seed={22}
          min={[7, 0.8, -4]}
          max={[14, 4, 4]}
          velocity={[-0.1, 0.05, 0.04]}
          size={[0.1, 0.16]}
          kind="dot"
          colorA="#f4f7a0"
          alpha={0.9}
          keepOut
          twinkle={{ hz: 0.6, amp: 0.08 }}
        />
      )}

      <ViewFrame>
        {BEANBAGS.map((c, i) => (
          <ViewPlaced key={c} x={[0.18, 0.52, 0.84][i]!} y={0.95} depth={7 + i}>
            <Block name={`beanbag-${i}`} size={[1.1, 0.8, 1]} color={c} />
          </ViewPlaced>
        ))}
        <ViewPlaced x={0.5} y={1.02} depth={6}>
          <Block name="blanket" size={[3.2, 0.1, 1.6]} color="#7a5a3a" />
        </ViewPlaced>
      </ViewFrame>
    </>
  );
}
