import type { ReactNode } from 'react';

interface DockKeyProps {
  id: string;
  label: ReactNode;
  onPress: () => void;
  /** aria-disabled: still focusable so the reason can be read. */
  disabled?: boolean;
  /** Toggle keys: adds the solid bar (state never relies on shade alone). */
  pressed?: boolean;
  busy?: boolean;
  large?: boolean;
  describedBy?: string;
  expanded?: boolean;
  controls?: string;
}

export function DockKey({
  id,
  label,
  onPress,
  disabled,
  pressed,
  busy,
  large,
  describedBy,
  expanded,
  controls,
}: DockKeyProps) {
  return (
    <button
      type="button"
      className={`key${large ? ' key--large' : ''}${pressed ? ' is-on' : ''}`}
      data-key={id}
      aria-disabled={disabled || undefined}
      aria-pressed={pressed}
      aria-busy={busy || undefined}
      aria-describedby={describedBy}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={() => {
        if (!disabled) onPress();
      }}
    >
      {label}
    </button>
  );
}
