/**
 * Lightweight hass-change guard.
 *
 * Structural parameter types keep this dependency-free and easy to unit-test
 * without importing HomeAssistant.
 */
export type MinimalHass = {
  states: Record<string, unknown>;
  locale?: unknown;
  themes?: unknown;
};

/**
 * Returns `true` when any of the following is true:
 * - `oldHass` is `undefined` (initial render — always recompute)
 * - `oldHass.locale !== newHass.locale` (locale changed → display strings change)
 * - `oldHass.themes !== newHass.themes` (theme changed → colours change)
 * - Any entity in `entityIds` has a different state object reference
 *   (`oldHass.states[id] !== newHass.states[id]`).
 *
 * HA state objects are immutable, so reference inequality is the canonical
 * "this entity changed" check.
 */
export function hasRelevantStatesChanged(
  oldHass: MinimalHass | undefined,
  newHass: MinimalHass,
  entityIds: string[]
): boolean {
  if (oldHass === undefined) return true;
  if (oldHass.locale !== newHass.locale) return true;
  if (oldHass.themes !== newHass.themes) return true;

  for (const id of entityIds) {
    if (oldHass.states[id] !== newHass.states[id]) return true;
  }

  return false;
}
