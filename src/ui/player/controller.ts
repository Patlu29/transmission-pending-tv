import { usePlayerStore } from '@/state/playerStore';
import { mapPlayerError, PLAYER_READY_TIMEOUT_MS } from './errors';

/**
 * The single YouTube player for the whole visit (ADR 0011 section 1).
 *
 * - The IFrame API script is injected only by the first `play()`, i.e. after the viewer picked a
 *   channel and accepted the notice. Before that the page makes no third-party request.
 * - The iframe is created by us, with the attributes the policy needs (nocookie host, referrer
 *   policy, allow list, title), then handed to `YT.Player`. It is never moved: layout changes only
 *   its holder's CSS.
 * - A channel change calls `loadVideoById` on the same player. `destroy()` removes it (channel 0, Stop).
 * - No transform, filter, opacity or mask is ever applied to the iframe or its holder.
 */
interface YTPlayer {
  loadVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getPlayerState(): number;
  destroy(): void;
}
interface YTEvent {
  data: number;
  target: YTPlayer;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: { events: Record<string, (e: YTEvent) => void> },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; BUFFERING: number; ENDED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const API_SRC = 'https://www.youtube.com/iframe_api';
export const EMBED_HOST = 'https://www.youtube-nocookie.com';
export const IFRAME_ALLOW = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
export const REFERRER_POLICY = 'strict-origin-when-cross-origin';

/** The embed URL: nocookie host, JS API on, muted inline autoplay from the viewer's click. */
export function embedUrl(videoId: string, options: { captions: boolean; origin: string }): string {
  const q = new URLSearchParams({
    enablejsapi: '1',
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    rel: '0',
    origin: options.origin,
  });
  if (options.captions) q.set('cc_load_policy', '1');
  return `${EMBED_HOST}/embed/${videoId}?${q.toString()}`;
}

let holder: HTMLElement | null = null;
let iframe: HTMLIFrameElement | null = null;
let player: YTPlayer | null = null;
let ready = false;
let apiPromise: Promise<YTNamespace> | null = null;
let readyTimer: ReturnType<typeof setTimeout> | undefined;
let muteTimer: ReturnType<typeof setInterval> | undefined;
let generation = 0;
let hiddenByTab = false;
let current: { videoId: string; title: string; captions: boolean } | null = null;

const store = () => usePlayerStore.getState();

function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error('YT missing'));
    };
    const script = document.createElement('script');
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('API script blocked'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

function fail(error: ReturnType<typeof mapPlayerError>) {
  clearTimeout(readyTimer);
  try {
    player?.stopVideo();
  } catch {
    /* the player may already be gone */
  }
  store().setError(error);
  store().setPhase('error');
}

function startReadyTimer(id: number) {
  clearTimeout(readyTimer);
  readyTimer = setTimeout(() => {
    if (id === generation && !ready) fail('blocked');
  }, PLAYER_READY_TIMEOUT_MS);
}

function pollMute() {
  clearInterval(muteTimer);
  muteTimer = setInterval(() => {
    try {
      if (player && ready) store().setMuted(player.isMuted());
    } catch {
      /* ignore */
    }
  }, 1000);
}

function onVisibility() {
  if (!player || !ready) return;
  if (document.hidden && store().phase === 'playing') {
    hiddenByTab = true;
    player.pauseVideo();
  } else if (!document.hidden && hiddenByTab) {
    hiddenByTab = false;
    player.playVideo();
  }
}

export const playerController = {
  /** The element the iframe lives in. Mounted once by PlayerHost; it is the iframe's only parent. */
  attach(el: HTMLElement | null) {
    holder = el;
  },

  /** Plays a video: creates the player on first use, otherwise changes video on the same one. */
  async play(videoId: string, title: string, captions: boolean) {
    if (!holder) return;
    const id = ++generation;
    current = { videoId, title, captions };
    store().setError(null);
    store().setVideoId(videoId);
    store().setPhase('loading');

    if (player && iframe && ready) {
      iframe.title = `${title}, live video from YouTube`;
      player.loadVideoById(videoId);
      return;
    }
    if (iframe) this.destroy(false);

    ready = false;
    iframe = document.createElement('iframe');
    iframe.id = 'youtube-player';
    iframe.title = `${title}, live video from YouTube`;
    iframe.setAttribute('allow', IFRAME_ALLOW);
    iframe.setAttribute('allowfullscreen', '');
    iframe.referrerPolicy = REFERRER_POLICY;
    iframe.style.cssText = 'display:block;width:100%;height:100%;border:0';
    iframe.src = embedUrl(videoId, { captions, origin: window.location.origin });
    holder.appendChild(iframe);
    startReadyTimer(id);

    try {
      const YT = await loadApi();
      if (id !== generation || !iframe) return;
      const el = iframe;
      player = new YT.Player(el, {
        events: {
          onReady: (e) => {
            if (id !== generation) return;
            ready = true;
            clearTimeout(readyTimer);
            player = e.target;
            pollMute();
            document.addEventListener('visibilitychange', onVisibility);
          },
          onStateChange: (e) => {
            if (id !== generation) return;
            const S = YT.PlayerState;
            if (e.data === S.PLAYING) {
              store().setPhase('playing');
              store().setMuted(e.target.isMuted());
            } else if (e.data === S.PAUSED) store().setPhase('paused');
            else if (e.data === S.BUFFERING && store().phase !== 'playing')
              store().setPhase('loading');
          },
          onError: (e) => {
            if (id === generation) fail(mapPlayerError(e.data));
          },
        },
      });
    } catch {
      if (id === generation) fail('blocked');
    }
  },

  /** Try the current video again (after an error). */
  retry() {
    if (!current) return;
    const { videoId, title, captions } = current;
    this.destroy(false);
    void this.play(videoId, title, captions);
  },

  pause() {
    try {
      if (player && ready && store().phase === 'playing') player.pauseVideo();
    } catch {
      /* ignore */
    }
  },

  resume() {
    try {
      if (player && ready && store().phase === 'paused') player.playVideo();
    } catch {
      /* ignore */
    }
  },

  /** Video sound from a viewer gesture. Browsers may refuse; YouTube's own control remains. */
  setMuted(muted: boolean) {
    try {
      if (!player || !ready) return;
      if (muted) player.mute();
      else player.unMute();
      store().setMuted(player.isMuted());
    } catch {
      /* ignore */
    }
  },

  /** Remove the player and its iframe: channel 0, Stop, or a channel that needs a fresh player. */
  destroy(resetStore = true) {
    generation++;
    clearTimeout(readyTimer);
    clearInterval(muteTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    try {
      player?.destroy();
    } catch {
      /* ignore */
    }
    iframe?.remove();
    player = null;
    iframe = null;
    ready = false;
    hiddenByTab = false;
    if (resetStore) {
      current = null;
      store().reset();
    }
  },

  /** For layout code: set or clear tabindex on the iframe while hidden. */
  setHidden(hidden: boolean) {
    if (iframe) iframe.tabIndex = hidden ? -1 : 0;
  },

  hasPlayer: () => iframe !== null,
};
