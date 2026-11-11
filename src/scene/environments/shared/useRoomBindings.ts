import { useLayoutEffect, useMemo } from 'react';
import { createRoomUniforms } from '../../materials/rooms/roomKit.ts';
import { useDisplayStore } from '../../integration/stores';
import { useWatchFrame } from '../watchFrame.ts';
import { setActiveUniforms } from './roomUniforms.ts';

/**
 * What the technical-artist's room components need from the scene: one `RoomUniforms` set for this scene
 * (registered so the projector can write the keep-out box into it), the solved watch distance (their rooms are
 * built around the watch camera), and a quality level ('low' on phones).
 */
export function useRoomBindings(defaultDistance: number) {
  const frame = useWatchFrame();
  const phone = useDisplayStore((s) => s.renderMode === '3d-screen');
  const uniforms = useMemo(() => createRoomUniforms(), []);
  useLayoutEffect(() => {
    setActiveUniforms(uniforms);
    return () => setActiveUniforms(null);
  }, [uniforms]);
  return {
    uniforms,
    watchDistance: frame?.distance ?? defaultDistance,
    quality: phone ? ('low' as const) : ('high' as const),
  };
}
