/**
 * Visit-only preferences in sessionStorage (V2-FR-24): per tab, no cookie, cleared when the tab closes.
 * Every access is guarded because storage can throw. Values are written only after a viewer action,
 * so a plain page load leaves storage empty.
 */
const PREFIX = 'transmission-pending:';

export function readPref(key: string): string | null {
  try {
    return window.sessionStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(PREFIX + key);
    else window.sessionStorage.setItem(PREFIX + key, value);
  } catch {
    /* storage unavailable: the choice lasts for this page load only */
  }
}
