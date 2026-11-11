import { useChannelStore } from '@/state/channelStore';
import { useDisplayStore } from '@/state/displayStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { usePlayerStore } from '@/state/playerStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useUiStore } from '@/state/uiStore';
import { playerController } from '@/ui/player/controller';

/** Actions shared by the dock and the keyboard (design-spec v2 section 3), with their announcements. */
const say = (m: string) => useUiStore.getState().announce(m);

export function toggleColour(): void {
  const settings = useSettingsStore.getState();
  const env = useEnvironmentStore.getState().id;
  const onChannel0 = env === 'tv-room' && useChannelStore.getState().current === null;
  if (onChannel0) {
    say('Channel 0 is always black and white.');
    return;
  }
  settings.toggleColour();
  say(
    useSettingsStore.getState().colour === 'colour'
      ? 'Room in colour.'
      : 'Room in black and white.',
  );
}

export function toggleFocus(): void {
  if (useChannelStore.getState().current === null) return;
  useEnvironmentStore.getState().toggleFocus();
  say(useEnvironmentStore.getState().userFocus ? 'Focus mode on.' : 'Focus mode off.');
}

/** Look around (browse pose) and Watch. Desktop 3D rooms, full motion only. */
export function toggleLook(): void {
  const display = useDisplayStore.getState();
  if (display.renderMode !== '3d-set' || display.reducedMotion) return;
  if (useChannelStore.getState().current === null) return;
  const env = useEnvironmentStore.getState();
  env.togglePose();
  say(
    useEnvironmentStore.getState().pose === 'browse'
      ? 'Looking around. The video is paused.'
      : 'Watching.',
  );
}

export function watchAgain(): void {
  if (useEnvironmentStore.getState().pose === 'browse') {
    useEnvironmentStore.getState().setPose('watch');
    say('Watching.');
  }
}

/** Mute or unmute the VIDEO from a viewer gesture. The browser may refuse; YouTube's control remains. */
export function toggleVideoMute(): void {
  if (!playerController.hasPlayer()) return;
  const muted = usePlayerStore.getState().muted;
  playerController.setMuted(!muted);
  say(usePlayerStore.getState().muted ? 'Video muted.' : 'Video sound on.');
}

export function toggleRoomSound(): void {
  useSettingsStore.getState().toggleRoomSound();
  say(useSettingsStore.getState().roomSound ? 'Room sound on.' : 'Room sound off.');
}

export function openGuide(): void {
  useUiStore.getState().openPanel('guide');
}

export function openRooms(): void {
  useUiStore.getState().openPanel('picker');
}
