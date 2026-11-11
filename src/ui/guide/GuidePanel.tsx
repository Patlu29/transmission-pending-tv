import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { GuideChannel } from '@/guide/schema';
import {
  isViaEmbed,
  liveChannelFromGuide,
  liveChannelFromLink,
  useChannelStore,
} from '@/state/channelStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { useGuideStore } from '@/state/guideStore';
import { useUiStore } from '@/state/uiStore';
import { FooterLinks } from '@/ui/components/FooterLinks';
import { SidePanel } from '@/ui/components/SidePanel';
import {
  NO_FILTERS,
  applyFilters,
  countryName,
  groupChannels,
  languageName,
  offAirReason,
  type GuideFilters,
} from './grouping';
import { LINK_MESSAGES, parseVideoLink, type LinkProblem } from './parseLink';

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement;

function checkedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function PasteForm() {
  const [value, setValue] = useState('');
  const [problem, setProblem] = useState<LinkProblem | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pasteNonce = useUiStore((s) => s.pasteNonce);

  // Key V opens the guide with this field focused.
  useEffect(() => {
    if (pasteNonce > 0) input.current?.focus();
  }, [pasteNonce]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = parseVideoLink(value);
    if (!result.ok) {
      setProblem(result.problem);
      input.current?.focus();
      return;
    }
    setProblem(null);
    // The link lives in memory for the visit only; the field clears and nothing is stored.
    setValue('');
    useUiStore.getState().closePanel('guide');
    useChannelStore.getState().request(liveChannelFromLink(result.videoId));
  };

  return (
    <form className="paste" onSubmit={submit} noValidate>
      <label htmlFor="paste-link">Paste a YouTube link</label>
      <div className="paste__row">
        <input
          id="paste-link"
          ref={input}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          aria-describedby={`paste-help${problem ? ' paste-error' : ''}`}
          aria-invalid={problem ? true : undefined}
          className={problem ? 'is-error' : undefined}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="key">
          Watch
        </button>
      </div>
      <p id="paste-help" className="paste__help">
        Watch, live, youtu.be or embed links only.
      </p>
      {problem && (
        <p id="paste-error" className="paste__error" role="alert">
          {LINK_MESSAGES[problem]}
        </p>
      )}
    </form>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">All</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Row({ channel }: { channel: GuideChannel }) {
  const current = useChannelStore((s) => s.current);
  const live = channel.state === 'live' && channel.live;
  const via = isViaEmbed(channel);
  const isCurrent = current?.number === channel.number;
  const onPick = () => {
    if (!live) {
      useUiStore.getState().announce('Off air. Cannot be started.');
      return;
    }
    const ch = liveChannelFromGuide(channel);
    if (!ch) return;
    useUiStore.getState().closePanel('guide');
    useChannelStore.getState().request(ch);
  };
  return (
    <li>
      <button
        type="button"
        className="guide-row"
        data-row
        data-number={channel.number}
        aria-disabled={live ? undefined : true}
        aria-current={isCurrent ? 'true' : undefined}
        onClick={onPick}
      >
        <span className="guide-row__num">{channel.number}</span>
        <span className="guide-row__name">
          {channel.name}
          {channel.stateMedia && <span className="tag">STATE MEDIA</span>}
          {via && <span className="tag">VIA YOUTUBE EMBED</span>}
        </span>
        <span className="guide-row__meta">
          {channel.languages.map(languageName).join(', ')}, {channel.genre},{' '}
          {countryName(channel.country)}
        </span>
        <span className={`guide-row__status${live ? ' is-live' : ''}`}>
          {live ? (channel.stale ? 'LIVE (check)' : 'LIVE') : 'OFF AIR'}
        </span>
        {!live && <span className="guide-row__reason">{offAirReason(channel)}</span>}
        {live && channel.stale && channel.live && (
          <span className="guide-row__reason">
            Last checked {checkedAt(channel.live.checkedAt)}.
          </span>
        )}
      </button>
    </li>
  );
}

/**
 * The channel guide (design-spec v2 1.4, 1.5): a teletext-style panel in DOM (real, selectable
 * text), grouped by kind, with tags, filters, Find, paste-a-link and the last-refreshed time.
 * It is in every room. It is never over the player: if it would overlap, the player is paused
 * and hidden while it is open.
 */
export function GuidePanel() {
  const open = useUiStore((s) => s.panel === 'guide');
  const status = useGuideStore((s) => s.status);
  const guide = useGuideStore((s) => s.guide);
  const sample = useGuideStore((s) => s.sample);
  const envId = useEnvironmentStore((s) => s.id);
  const current = useChannelStore((s) => s.current);
  const [filters, setFilters] = useState<GuideFilters>(NO_FILTERS);
  const digits = useRef({
    text: '',
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });
  const listRef = useRef<HTMLDivElement>(null);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) void useGuideStore.getState().load();
  }, [open]);

  const channels = useMemo(() => guide?.channels ?? [], [guide]);
  const groups = useMemo(() => groupChannels(applyFilters(channels, filters)), [channels, filters]);
  const options = useMemo(() => {
    const uniq = (xs: string[]) => [...new Set(xs)].sort();
    return {
      language: uniq(channels.flatMap((c) => c.languages)).map((l): [string, string] => [
        l,
        languageName(l),
      ]),
      genre: uniq(channels.map((c) => c.genre)).map((g): [string, string] => [g, g]),
      country: uniq(channels.map((c) => c.country))
        .map((c): [string, string] => [c, countryName(c)])
        .sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [channels]);

  const rows = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-row]') ?? []);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/' && !isTextField(e.target)) {
      e.preventDefault();
      findRef.current?.focus();
      return;
    }
    const list = rows();
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (isTextField(e.target) && !(e.target as HTMLElement).closest('.guide-find')) return;
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(list.length - 1, at + 1) : Math.max(0, at - 1);
      list[at < 0 ? 0 : next]?.focus();
    } else if ((e.key === 'Home' || e.key === 'End') && !isTextField(e.target)) {
      e.preventDefault();
      list[e.key === 'Home' ? 0 : list.length - 1]?.focus();
    } else if (/^\d$/.test(e.key) && !isTextField(e.target)) {
      // Digits jump to a channel number.
      const d = digits.current;
      clearTimeout(d.timer);
      d.text = (d.text + e.key).slice(0, 3);
      const row = list.find((r) => r.dataset.number === String(Number(d.text)));
      row?.focus();
      d.timer = setTimeout(() => (d.text = ''), 1500);
    }
  };

  return (
    <SidePanel
      id="guide"
      title="GUIDE"
      titleId="guide-title"
      className="panel--guide"
      initialFocus="#paste-link"
      onKeyDown={onKeyDown}
    >
      <div className="panel__body">
        {status === 'ready' && guide && (
          <p className="guide-checked">
            Guide checked {checkedAt(guide.generatedAt)}
            {sample ? ' (development sample)' : ''}
          </p>
        )}
        <PasteForm />
        {status === 'loading' && <p>Tuning the guide...</p>}
        {status === 'unavailable' && (
          <div className="guide-down" role="status">
            <h3>THE GUIDE IS NOT ON AIR.</h3>
            <p>You can still paste a link.</p>
          </div>
        )}
        {status === 'ready' && (
          <>
            <div className="filters" role="group" aria-label="Filter the guide">
              <Select
                label="Language"
                value={filters.language}
                onChange={(language) => setFilters({ ...filters, language })}
                options={options.language}
              />
              <Select
                label="Genre"
                value={filters.genre}
                onChange={(genre) => setFilters({ ...filters, genre })}
                options={options.genre}
              />
              <Select
                label="Country"
                value={filters.country}
                onChange={(country) => setFilters({ ...filters, country })}
                options={options.country}
              />
              <label className="filter">
                <span>Owner type</span>
                <select
                  value={filters.owner}
                  onChange={(e) =>
                    setFilters({ ...filters, owner: e.target.value as GuideFilters['owner'] })
                  }
                >
                  <option value="all">All</option>
                  <option value="state-media">State media</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="filter guide-find">
                <span>Find a channel</span>
                <input
                  ref={findRef}
                  type="search"
                  value={filters.find}
                  onChange={(e) => setFilters({ ...filters, find: e.target.value })}
                />
              </label>
            </div>
            <div ref={listRef} className="guide-list">
              {envId === 'tv-room' && (
                <ul>
                  <li>
                    <button
                      type="button"
                      className="guide-row"
                      data-row
                      data-number="0"
                      aria-current={current === null ? 'true' : undefined}
                      onClick={() => {
                        useUiStore.getState().closePanel('guide');
                        useChannelStore.getState().playStory();
                      }}
                    >
                      <span className="guide-row__num">0</span>
                      <span className="guide-row__name">The Occupant (the story)</span>
                    </button>
                  </li>
                </ul>
              )}
              {groups.map((g) => (
                <section key={g.name}>
                  <h2 className="guide-group">{g.name}</h2>
                  <ul>
                    {g.channels.map((c) => (
                      <Row key={c.number} channel={c} />
                    ))}
                  </ul>
                </section>
              ))}
              {groups.length === 0 && <p>No channel matches those filters.</p>}
            </div>
          </>
        )}
        <FooterLinks className="footer-links--panel" />
      </div>
    </SidePanel>
  );
}
