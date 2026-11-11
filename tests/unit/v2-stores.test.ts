import { beforeEach, describe, expect, it } from 'vitest';
import { useEnvironmentStore } from '../../src/state/environmentStore.ts';
import { usePlayerStore } from '../../src/state/playerStore.ts';
import { useSettingsStore } from '../../src/state/settingsStore.ts';

describe('settingsStore', () => {
  beforeEach(() =>
    useSettingsStore.setState({ colour: 'bw', roomSound: false, noticeAccepted: false }),
  );

  it('starts black and white, with room sound off and the notice not yet accepted', () => {
    const s = useSettingsStore.getState();
    expect(s.colour).toBe('bw');
    expect(s.roomSound).toBe(false);
    expect(s.noticeAccepted).toBe(false);
  });

  it('toggles colour and room sound, and records the notice', () => {
    useSettingsStore.getState().toggleColour();
    expect(useSettingsStore.getState().colour).toBe('colour');
    useSettingsStore.getState().toggleColour();
    expect(useSettingsStore.getState().colour).toBe('bw');
    useSettingsStore.getState().toggleRoomSound();
    expect(useSettingsStore.getState().roomSound).toBe(true);
    useSettingsStore.getState().acceptNotice();
    expect(useSettingsStore.getState().noticeAccepted).toBe(true);
  });
});

describe('environmentStore', () => {
  beforeEach(() =>
    useEnvironmentStore.setState({
      id: 'tv-room',
      pose: 'watch',
      userFocus: false,
      loading: null,
      ready: true,
    }),
  );

  it('lands in the TV room', () => {
    expect(useEnvironmentStore.getState().id).toBe('tv-room');
  });

  it('switching rooms returns to the watch pose and starts loading', () => {
    useEnvironmentStore.getState().setPose('browse');
    useEnvironmentStore.getState().setEnvironment('mountain-sky');
    const s = useEnvironmentStore.getState();
    expect(s.id).toBe('mountain-sky');
    expect(s.pose).toBe('watch');
    expect(s.ready).toBe(false);
    expect(s.loading).toEqual({ id: 'mountain-sky', progress: 0 });
  });

  it('clamps progress and clears loading when the scene reports ready', () => {
    useEnvironmentStore.getState().setEnvironment('cinema');
    useEnvironmentStore.getState().setLoading(3);
    expect(useEnvironmentStore.getState().loading?.progress).toBe(1);
    useEnvironmentStore.getState().setReady();
    expect(useEnvironmentStore.getState().loading).toBeNull();
    expect(useEnvironmentStore.getState().ready).toBe(true);
  });

  it('ignores the room it is already in and toggles pose and focus', () => {
    useEnvironmentStore.getState().setEnvironment('tv-room');
    expect(useEnvironmentStore.getState().loading).toBeNull();
    useEnvironmentStore.getState().togglePose();
    expect(useEnvironmentStore.getState().pose).toBe('browse');
    useEnvironmentStore.getState().toggleFocus();
    expect(useEnvironmentStore.getState().userFocus).toBe(true);
  });
});

describe('playerStore', () => {
  beforeEach(() => usePlayerStore.getState().reset());

  it('starts idle and muted with no error', () => {
    const s = usePlayerStore.getState();
    expect(s.phase).toBe('none');
    expect(s.error).toBeNull();
    expect(s.muted).toBe(true);
  });

  it('records an error class and resets cleanly', () => {
    usePlayerStore.getState().setError('off-air');
    usePlayerStore.getState().setPhase('error');
    expect(usePlayerStore.getState().error).toBe('off-air');
    usePlayerStore.getState().reset();
    expect(usePlayerStore.getState().phase).toBe('none');
    expect(usePlayerStore.getState().error).toBeNull();
  });

  it('keeps the corners the scene reports', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ] as const;
    usePlayerStore.getState().reportCorners(corners, { width: 100, height: 50 });
    expect(usePlayerStore.getState().corners).toEqual(corners);
  });
});
