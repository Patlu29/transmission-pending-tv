import { DiaryList, IntroPages } from './IntroText';

/**
 * The text of record (FR-18): always in the DOM, visually hidden, in reading
 * order, with every fact as `<span data-fact>`. In 2D mode the visible screen is
 * a separate aria-hidden rendering of the same frame model.
 */
export function Transcript() {
  return (
    <article className="transcript sr-only" aria-label="Intro text" id="transcript">
      <IntroPages tagFacts />
      <DiaryList />
    </article>
  );
}
