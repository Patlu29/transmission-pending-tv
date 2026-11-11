import { ENVIRONMENTS } from '@/scene/environments/registry';
import type { EnvironmentId } from '@/scene/environments/contract';

/** Picker order (design-spec v2 1.3): the mountain sky is featured first. */
export const PICKER_ORDER: EnvironmentId[] = [
  'mountain-sky',
  'tv-room',
  'cinema',
  'drive-in',
  'open-air',
  'bedroom',
  'chai-stall',
  'train',
  'space-deck',
];

export const ROOM_MOOD: Record<EnvironmentId, string> = {
  'mountain-sky': 'Stand on a summit above the clouds. The video floats in the sky.',
  'tv-room': 'A 1970s set in a dark room. The story lives here.',
  cinema: 'An empty auditorium, you in the middle.',
  'drive-in': 'A car at the drive-in, the screen through the windscreen.',
  'open-air': 'An open-air screen under string lights and a night sky.',
  bedroom: 'A rainy night, a lamp and a window.',
  'chai-stall': 'A chai stall, steam and a small screen.',
  train: 'A window seat, the evening going by.',
  'space-deck': 'A quiet deck with the Earth in the windows.',
};

/** Room names used in announcements and the picker (the registry holds the working labels). */
export const roomLabel = (id: EnvironmentId) => ENVIRONMENTS[id].label;
