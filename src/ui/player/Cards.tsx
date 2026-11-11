import type { CSSProperties } from 'react';
import { useChannelStore, type LiveChannel } from '@/state/channelStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { useUiStore } from '@/state/uiStore';
import type { PlayerErrorClass } from '@/state/playerStore';
import { playerController } from './controller';
import { NO_SIGNAL } from './errors';
import type { ResolvedLayout } from './layout';

/** Tags beside a channel name: always text, never colour alone (design-spec v2 1.4). */
export function ChannelTags({ channel }: { channel: LiveChannel }) {
  return (
    <>
      {channel.stateMedia && <span className="tag">STATE MEDIA</span>}
      {channel.viaEmbed && <span className="tag">VIA YOUTUBE EMBED</span>}
    </>
  );
}

/**
 * Calm: a site-drawn still card where the player will be (design-spec v2 1.7). It is a page
 * element, not the player, and contains no YouTube image: nothing is requested from YouTube
 * until Play is pressed.
 */
export function StillCard({ channel, style }: { channel: LiveChannel; style: CSSProperties }) {
  return (
    <section
      className="card card--still"
      style={style}
      aria-label={`${channel.name}, ready to play`}
    >
      <h2 className="card__title">{channel.name}</h2>
      <p className="card__owner">
        {channel.owner} <ChannelTags channel={channel} />
      </p>
      <p>Press play to start the video. It will start muted. Captions will be asked for.</p>
      <button
        type="button"
        className="key key--large"
        data-key="play"
        onClick={() => useChannelStore.getState().play()}
      >
        Play
      </button>
    </section>
  );
}

/** In-character no-signal card in the player's place. Static in every mode (design-spec v2 1.9). */
export function NoSignalCard({
  error,
  channel,
  style,
}: {
  error: PlayerErrorClass;
  channel: LiveChannel;
  style: CSSProperties;
}) {
  const copy = NO_SIGNAL[error];
  const ui = useUiStore.getState;
  const action = (a: (typeof copy.actions)[number]) => {
    switch (a) {
      case 'retry':
        return (
          <button key={a} type="button" className="key" onClick={() => playerController.retry()}>
            Try again
          </button>
        );
      case 'next':
        return (
          <button
            key={a}
            type="button"
            className="key"
            onClick={() => useChannelStore.getState().step(1)}
          >
            Next channel
          </button>
        );
      case 'guide':
        return (
          <button key={a} type="button" className="key" onClick={() => ui().openPanel('guide')}>
            Open the guide
          </button>
        );
      case 'paste':
        return (
          <button key={a} type="button" className="key" onClick={() => ui().openPaste()}>
            Paste another link
          </button>
        );
      case 'watch':
        return (
          <a key={a} className="key" href={channel.watchUrl} target="_blank" rel="noopener">
            Watch on YouTube
          </a>
        );
    }
  };
  return (
    <section className="card card--nosignal" style={style} role="alert" aria-label="No signal">
      <h2 className="card__title">{copy.heading}</h2>
      <p>{copy.body}</p>
      <div className="card__actions">{copy.actions.map(action)}</div>
    </section>
  );
}

/**
 * Directly under the player: name, owner tags, "Watch on YouTube", Back to controls and Stop
 * (design-spec v2 1.12, V2-YT-9). It is laid out outside the player rectangle.
 */
export function InfoRow({
  channel,
  info,
  layout,
}: {
  channel: LiveChannel;
  info: { x: number; y: number; width: number; height: number };
  layout: Extract<ResolvedLayout, { kind: 'inline' | 'focus' }>;
}) {
  const userFocus = useEnvironmentStore((s) => s.userFocus);
  return (
    <>
      {layout.kind === 'focus' && (
        <header className="focus-header">
          <span className="focus-header__title">
            {channel.number === null ? 'Your link' : `CH ${channel.number}`} {channel.name}
          </span>
          {userFocus && (
            <button
              type="button"
              className="key"
              aria-label="Exit focus mode"
              onClick={() => useEnvironmentStore.getState().setFocus(false)}
            >
              Exit focus
            </button>
          )}
        </header>
      )}
      <div
        className="info-row"
        data-layout={layout.kind}
        style={{ left: info.x, top: info.y, width: info.width, minHeight: info.height }}
      >
        <span className="info-row__name">{channel.name}</span>
        <ChannelTags channel={channel} />
        <a className="info-row__link" href={channel.watchUrl} target="_blank" rel="noopener">
          Watch on YouTube
        </a>
        <button
          type="button"
          className="key"
          data-key="back"
          onClick={() => useUiStore.getState().requestFocus('guide')}
        >
          Back to controls
        </button>
        <button
          type="button"
          className="key"
          data-key="stop"
          onClick={() => useChannelStore.getState().stop()}
        >
          Stop
        </button>
      </div>
    </>
  );
}
