import { facts, intro } from '@/facts';
import type { IntroLine } from '@/facts/schema';

const title = (id: string) => {
  const t = id.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function Line({ line, tagFacts }: { line: IntroLine; tagFacts: boolean }) {
  return (
    <p>
      {line.segments.map((seg, i) =>
        seg.kind === 'fact' ? (
          <span key={i} className="fact" data-fact={tagFacts ? seg.key : undefined}>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  );
}

/**
 * The full resolved intro in reading order: each page an h2, each line a p.
 * With `tagFacts`, every fact is `<span data-fact="{key}">` (FR-11, QA reads
 * these). The dialog copy leaves the attribute off so the page never holds two
 * sets of data-fact elements.
 */
export function IntroPages({ tagFacts }: { tagFacts: boolean }) {
  return (
    <>
      {intro.pages.map((page) => (
        <section key={page.id} data-page={page.id}>
          <h2>{title(page.id)}</h2>
          {page.lines.map((line) => (
            <Line key={line.id} line={line} tagFacts={tagFacts} />
          ))}
        </section>
      ))}
    </>
  );
}

/** Plain list of the build diary for screen readers (not tagged as facts). */
export function DiaryList() {
  return (
    <section data-page="diary-list">
      <h2>Build log</h2>
      <ol>
        {facts.git.commits.map((c) => (
          <li key={c.hash}>
            {c.shortHash}, {c.dateDisplay}: {c.subject}
          </li>
        ))}
      </ol>
    </section>
  );
}
