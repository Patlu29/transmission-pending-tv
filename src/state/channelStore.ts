import { create } from 'zustand';
import { liveChannelFromGuide, nextLiveChannel, type LiveChannel } from './liveChannel';
import { useDisplayStore } from './displayStore';
import { useEnvironmentStore } from './environmentStore';
import { useGuideStore } from './guideStore';
import { useIntroStore, isPoweredStatus } from './introStore';
import { useSettingsStore } from './settingsStore';
import { useUiStore } from './uiStore';

export {
  isViaEmbed,
  liveChannelFromGuide,
  liveChannelFromLink,
  watchUrlFor,
  type LiveChannel,
} from './liveChannel';

/**
 * What is on air. `current === null` means channel 0: in the TV room the Occupant's story (v1,
 * unchanged); in every other room an idle screen. A LiveChannel is one YouTube video, from the
 * guide or from a pasted link (the pasted link is held in memory only and never stored).
 */
interface ChannelState {
  current: LiveChannel | null;
  /** A pick waiting for the first-play notice. */
  pending: LiveChannel | null;
  /** What the TV room set was showing when a live channel replaced it, so Stop can put it back. */
  resume: 'diary' | 'card' | null;
  /** False in Calm until the viewer presses Play on the still card. */
  started: boolean;
  /** Digits typed for a channel number (1.5 s timeout). */
  digits: string;
  /** Pick a channel. Opens the notice first if it has not been accepted this visit. */
  request(channel: LiveChannel): void;
  confirmNotice(): void;
  cancelNotice(): void;
  /** Press Play on the Calm still card. */
  play(): void;
  /** Channel 0 from the guide: leave the live channel and start the story. */
  playStory(): void;
  /** Stop: clear the channel and return to the room (or channel 0 in the TV room). */
  stop(): void;
  /** Step to the next or previous LIVE guide channel, wrapping. */
  step(direction: 1 | -1): void;
  typeDigit(digit: string): void;
  commitDigits(): void;
  clearDigits(): void;
}

let digitsTimer: ReturnType<typeof setTimeout> | undefined;
const DIGIT_TIMEOUT_MS = 1500;

function announce(message: string) {
  useUiStore.getState().announce(message);
}

/** Starts the pick: in the TV room, a powered set is switched off first (the CRT collapses). */
function commit(channel: LiveChannel, set: (p: Partial<ChannelState>) => void) {
  let resume: ChannelState['resume'] = null;
  const calm = useDisplayStore.getState().reducedMotion;
  if (useEnvironmentStore.getState().id === 'tv-room') {
    const intro = useIntroStore.getState();
    if (isPoweredStatus(intro.status)) {
      resume = intro.status === 'ended' ? 'diary' : 'card';
      intro.power();
    }
  }
  // Changing channel between live channels keeps what to restore.
  set({ current: channel, pending: null, started: !calm, ...(resume ? { resume } : {}) });
  const where = channel.number === null ? 'your link' : `channel ${channel.number}`;
  announce(`${where}, ${channel.name}, live`);
}

export const useChannelStore = create<ChannelState>()((set, get) => ({
  current: null,
  pending: null,
  started: false,
  resume: null,
  digits: '',

  request(channel) {
    if (useSettingsStore.getState().noticeAccepted) {
      commit(channel, set);
      return;
    }
    set({ pending: channel });
    useUiStore.getState().openPanel('notice');
  },

  confirmNotice() {
    const { pending } = get();
    useSettingsStore.getState().acceptNotice();
    useUiStore.getState().closePanel('notice');
    if (pending) commit(pending, set);
  },

  cancelNotice() {
    set({ pending: null });
    useUiStore.getState().closePanel('notice');
  },

  play: () => set({ started: true }),

  playStory() {
    set({ current: null, pending: null, started: false, resume: null });
    const intro = useIntroStore.getState();
    if (useEnvironmentStore.getState().id === 'tv-room' && !isPoweredStatus(intro.status))
      intro.power();
  },

  stop() {
    if (!get().current) return;
    const { resume } = get();
    set({ current: null, pending: null, started: false, resume: null });
    // TV room: the set comes back on at the diary index if the story had ended, else the test card.
    if (resume && useEnvironmentStore.getState().id === 'tv-room')
      useIntroStore.getState().resumeIdle(resume);
    announce('Stopped. Back in the room.');
    useUiStore.getState().requestFocus('guide');
  },

  step(direction) {
    const guide = useGuideStore.getState().guide;
    if (!guide) {
      void useGuideStore.getState().load();
      return;
    }
    const next = nextLiveChannel(guide.channels, get().current?.number ?? null, direction);
    if (!next) {
      announce('No channel is on air.');
      return;
    }
    const channel = next ? liveChannelFromGuide(next) : null;
    if (channel) get().request(channel);
  },

  typeDigit(digit) {
    if (!/^\d$/.test(digit)) return;
    const digits = (get().digits + digit).slice(0, 3);
    clearTimeout(digitsTimer);
    set({ digits });
    digitsTimer = setTimeout(() => get().commitDigits(), DIGIT_TIMEOUT_MS);
  },

  commitDigits() {
    clearTimeout(digitsTimer);
    const { digits } = get();
    set({ digits: '' });
    if (digits === '') return;
    const n = Number(digits);
    if (n === 0) {
      // `0` is the Occupant: stay on channel 0 (the TV room) or leave the live channel.
      if (useEnvironmentStore.getState().id === 'tv-room') get().stop();
      return;
    }
    const guide = useGuideStore.getState().guide;
    const ch = guide?.channels.find((c) => c.number === n);
    const channel = ch ? liveChannelFromGuide(ch) : null;
    if (channel) get().request(channel);
    else announce(ch ? 'Off air. Cannot be started.' : `No channel ${n}.`);
  },

  clearDigits() {
    clearTimeout(digitsTimer);
    set({ digits: '' });
  },
}));
