import type { EnvironmentId } from './contract.ts';
import { ROOM_COMPONENTS } from './lazyEnvironments.ts';

/**
 * Renders the chosen room. Keyed by id, so switching unmounts the previous room (R3F disposes what the
 * room created declaratively; rooms dispose their own manual resources in effect cleanups).
 */
export function EnvironmentHost({ id }: { id: EnvironmentId }) {
  const Room = ROOM_COMPONENTS[id];
  return <Room key={id} />;
}
