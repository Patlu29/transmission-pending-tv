import { useEffect } from 'react';
import { useGuideStore } from '@/state/guideStore';
import { isViaEmbed } from '@/state/channelStore';
import { useUiStore } from '@/state/uiStore';
import { Modal } from './Modal';

/** Credits (design-spec v2 1.13, V2-YT-9): every guide channel with its owner and a link to it on YouTube. */
export function CreditsDialog() {
  const open = useUiStore((s) => s.panel === 'credits');
  const guide = useGuideStore((s) => s.guide);
  useEffect(() => {
    if (open) void useGuideStore.getState().load();
  }, [open]);
  const channels = guide?.channels ?? [];
  const hasNasa = channels.some((c) => /nasa/i.test(c.name));
  const hasVia = channels.some(isViaEmbed);
  return (
    <Modal
      open={open}
      labelledBy="credits-title"
      onClose={() => useUiStore.getState().closePanel('credits')}
    >
      <header className="dialog__head">
        <h2 id="credits-title" tabIndex={-1} data-initial-focus>
          Credits
        </h2>
        <button
          type="button"
          className="key"
          onClick={() => useUiStore.getState().closePanel('credits')}
        >
          Close
        </button>
      </header>
      <div className="dialog__body">
        <p>
          Every channel plays in its own YouTube player. Names identify the source only. This site
          is not affiliated with or endorsed by YouTube or any listed channel.
        </p>
        {hasVia && (
          <p>
            Doordarshan and Sansad TV channels are shown through the channels&rsquo; YouTube embeds.
          </p>
        )}
        {hasNasa && (
          <p>
            NASA material is credited to NASA. Its use here does not imply NASA&rsquo;s endorsement.
          </p>
        )}
        {channels.length === 0 ? (
          <p>The guide is not on air, so there are no channels to list.</p>
        ) : (
          <ul className="credits-list">
            {channels.map((c) => (
              <li key={c.number}>
                {c.name}
                {c.stateMedia ? ', state media' : ''}
                {': '}
                <a href={c.attribution.url} target="_blank" rel="noopener">
                  Watch on YouTube ({c.attribution.label})
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
