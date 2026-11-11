import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { CanvasTexture, SRGBColorSpace, type Group } from 'three';
import { useChannelName, useEnvironmentStore, useIsLive } from './seam.ts';
import { registerAnchor } from './anchorRegistry.ts';
import type { ScreenAnchorSpec } from './contract.ts';

interface Props {
  spec: ScreenAnchorSpec;
  position?: [number, number, number];
  /** Anchors face +z; a room may yaw or tilt the whole screen, never roll it. */
  rotation?: [number, number, number];
  /** Base colour of the face behind the player (near-black). */
  faceColor?: string;
  /** Screen-owned dressing (portal frame and the like), placed in anchor-local metres. */
  children?: ReactNode;
}

function drawCard(c: HTMLCanvasElement, lines: string[]) {
  const g = c.getContext('2d');
  if (!g) return;
  g.fillStyle = '#060606';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#d9d9d9';
  g.textAlign = 'center';
  g.font = `600 ${Math.round(c.height * 0.1)}px "Barlow Condensed", sans-serif`;
  lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height * (0.46 + i * 0.14)));
}

/**
 * The one screen anchor of a room (ADR 0011). Local XY is the screen face, centred on the origin,
 * +Z towards the viewer, `widthM` by `widthM / aspect` metres. It registers itself so the projector
 * can solve the watch pose and publish the player rect. The face is a near-black plane that also
 * carries the site-made paused card in the browse pose (channel name and "Paused").
 * PLACEHOLDER: the card is a plain canvas, not the technical-artist's idle card.
 */
export function ScreenAnchor({
  spec,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  faceColor,
  children,
}: Props) {
  const group = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const pose = useEnvironmentStore((s) => s.pose);
  const live = useIsLive();
  const name = useChannelName();
  const h = spec.widthM / spec.aspect;

  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = Math.round(512 / spec.aspect);
    return c;
  }, [spec.aspect]);
  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    const showCard = pose === 'browse' || !live;
    if (showCard) drawCard(canvas, !live ? ['STAND BY'] : [name ?? 'CHANNEL', 'PAUSED']);
    else drawCard(canvas, []);
    texture.needsUpdate = true; // eslint-disable-line react-hooks/immutability -- three.js texture flag
    invalidate();
  }, [pose, live, name, canvas, texture, invalidate]);

  useEffect(() => {
    if (!group.current) return;
    return registerAnchor({ object: group.current, spec });
  }, [spec]);

  return (
    <group ref={group} name="screen-anchor" position={position} rotation={rotation}>
      <mesh name="screen-face">
        <planeGeometry args={[spec.widthM, h]} />
        {faceColor ? (
          <meshBasicMaterial map={texture} color={faceColor} toneMapped={false} />
        ) : (
          <meshBasicMaterial map={texture} toneMapped={false} />
        )}
      </mesh>
      {children}
    </group>
  );
}
