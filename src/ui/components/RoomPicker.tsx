import { useRef, type KeyboardEvent } from 'react';
import { ENVIRONMENTS } from '@/scene/environments/registry';
import type { EnvironmentId } from '@/scene/environments/contract';
import { useEnvironmentStore } from '@/state/environmentStore';
import { useUiStore } from '@/state/uiStore';
import { PICKER_ORDER, ROOM_MOOD, roomLabel } from './rooms';
import { RoomSchematic } from './RoomSchematic';
import { SidePanel } from './SidePanel';

function prefetch(id: EnvironmentId) {
  // Importing the chunk early (hover or focus) is cached by the browser; errors surface on choosing.
  void ENVIRONMENTS[id].load().catch(() => undefined);
}

/**
 * The room picker (design-spec v2 1.3): a radiogroup with roving tabindex, nine rooms, the
 * mountain sky as the hero row. Choosing a room never starts or stops the video by itself; the
 * scene keeps the old room until the new one is ready.
 */
export function RoomPicker() {
  const current = useEnvironmentStore((s) => s.id);
  const loading = useEnvironmentStore((s) => s.loading);
  const ref = useRef<HTMLDivElement>(null);

  const choose = (id: EnvironmentId) => {
    useEnvironmentStore.getState().setEnvironment(id);
    useUiStore.getState().announce(`Room: ${roomLabel(id)}`);
    useUiStore.getState().closePanel('picker');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const radios = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
    const at = radios.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    const move = (to: number) => {
      e.preventDefault();
      radios[(to + radios.length) % radios.length]?.focus();
    };
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') move(at + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') move(at - 1);
  };

  return (
    <SidePanel
      id="picker"
      title="Change the room"
      titleId="picker-title"
      className="panel--picker"
      initialFocus='[role="radio"][tabindex="0"]'
      onKeyDown={onKeyDown}
    >
      <div className="panel__body">
        <div ref={ref} role="radiogroup" aria-label="Room" className="room-list">
          {PICKER_ORDER.map((id) => {
            const selected = id === current;
            const isLoading = loading?.id === id;
            const hero = id === 'mountain-sky';
            return (
              <div
                key={id}
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                className={`room-row${hero ? ' room-row--hero' : ''}${selected ? ' is-current' : ''}`}
                onClick={() => choose(id)}
                onMouseEnter={() => prefetch(id)}
                onFocus={() => prefetch(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    choose(id);
                  }
                }}
              >
                <RoomSchematic id={id} width={hero ? 192 : 96} height={hero ? 108 : 54} />
                <span className="room-row__text">
                  <span className="room-row__name">
                    {roomLabel(id)}
                    {hero && <span className="tag">Featured</span>}
                    {selected && <span className="tag">Current</span>}
                  </span>
                  <span className="room-row__mood">{ROOM_MOOD[id]}</span>
                  {isLoading && (
                    <span className="room-row__loading">
                      Loading {roomLabel(id)}... {Math.round((loading?.progress ?? 0) * 100)}%
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SidePanel>
  );
}
