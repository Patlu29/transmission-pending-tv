// PLACEHOLDER. Owner: frontend-developer. Proves the fact pipeline end to end;
// replace with the real app (see docs/architecture.md §4 and §6).
import { intro } from '@/facts';

export default function App() {
  return (
    <main>
      <h1>Transmission Pending</h1>
      {intro.pages.map((page) => (
        <section key={page.id} aria-label={page.id}>
          {page.lines.map((line) => (
            <p key={line.id}>
              {line.segments.map((segment, index) =>
                segment.kind === 'fact' ? (
                  <span key={index} data-fact={segment.key}>
                    {segment.text}
                  </span>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
