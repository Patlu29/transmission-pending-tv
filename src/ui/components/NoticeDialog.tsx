import { useChannelStore } from '@/state/channelStore';
import { useDisplayStore } from '@/state/displayStore';
import { useUiStore } from '@/state/uiStore';
import { YOUTUBE_TERMS_URL } from './FooterLinks';
import { Modal } from './Modal';

/**
 * The first-play notice (design-spec v2 1.6, V2-FR-28). Shown once per visit before the first
 * YouTube request: it is the consent step and the flash warning. No request goes to any YouTube
 * origin before Continue; the player script is injected only after it.
 */
export function NoticeDialog() {
  const open = useUiStore((s) => s.panel === 'notice');
  const calm = useDisplayStore((s) => s.reducedMotion);
  return (
    <Modal
      open={open}
      labelledBy="notice-title"
      className="dialog--notice"
      onClose={() => useChannelStore.getState().cancelNotice()}
    >
      <div className="dialog__body">
        <h2 id="notice-title" tabIndex={-1} data-initial-focus>
          Before this plays
        </h2>
        <p>
          The video comes from YouTube and from the channel&rsquo;s owner, not from this site. It
          may be loud, may flash or flicker, and may be blocked in some countries. This site cannot
          change the video or make it safer, so we never put anything over it.
        </p>
        <p>
          YouTube may set cookies or collect data once the video loads. We load the player from
          youtube-nocookie.com, which reduces this but does not remove it. Playing a video means you
          accept the{' '}
          <a href={YOUTUBE_TERMS_URL} target="_blank" rel="noopener">
            YouTube Terms of Service
          </a>
          .
        </p>
        <p>
          This site itself collects no personal data. See{' '}
          <a href="./privacy.html" target="_blank" rel="noopener">
            Privacy
          </a>{' '}
          and{' '}
          <a href="./privacy.html#third-parties" target="_blank" rel="noopener">
            Third parties
          </a>
          .
        </p>
        {calm && (
          <p>
            <strong>Calm mode is on:</strong> nothing will start by itself. You will see a still
            card first, and captions will be asked for.
          </p>
        )}
        <div className="dialog__actions">
          <button
            type="button"
            className="key"
            onClick={() => useChannelStore.getState().cancelNotice()}
          >
            Back
          </button>
          <button
            type="button"
            className="key key--large"
            onClick={() => useChannelStore.getState().confirmNotice()}
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
}
