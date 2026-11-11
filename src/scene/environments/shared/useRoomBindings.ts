import { useDisplayStore } from '../../integration/stores';
import { useWatchFrame } from '../watchFrame.ts';
import { sharedRoomUniforms } from './roomUniforms.ts';

/**
 * What the technical-artist's room components need from the scene: the shared uniforms, the solved
 * watch distance (their rooms are built around the watch camera), and a quality level ('low' on phones).
 */
export function useRoomBindings(defaultDistance: number) {
  const frame = useWatchFrame();
  const phone = useDisplayStore((s) => s.renderMode === '3d-screen');
  return {
    uniforms: sharedRoomUniforms,
    watchDistance: frame?.distance ?? defaultDistance,
    quality: phone ? ('low' as const) : ('high' as const),
  };
}
