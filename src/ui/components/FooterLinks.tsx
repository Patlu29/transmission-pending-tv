import { useUiStore } from '@/state/uiStore';

export const YOUTUBE_TERMS_URL = 'https://www.youtube.com/t/terms';

/** Footer links on every surface (design-spec v2 1.13): Privacy, Credits, Third parties, YouTube Terms. */
export function FooterLinks({ className }: { className?: string }) {
  return (
    <nav className={`footer-links ${className ?? ''}`} aria-label="About this site">
      <a href="./privacy.html">Privacy</a>
      <button
        type="button"
        className="linkkey"
        onClick={() => useUiStore.getState().openPanel('credits')}
      >
        Credits
      </button>
      <a href="./privacy.html#third-parties">Third parties</a>
      <a href={YOUTUBE_TERMS_URL} target="_blank" rel="noopener">
        YouTube Terms of Service
      </a>
    </nav>
  );
}
