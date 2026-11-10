/** A problem that must stop the build. Message should name the source and the fix. */
export class FactsError extends Error {
  override name = 'FactsError';
}

export function fail(message: string): never {
  throw new FactsError(message);
}
