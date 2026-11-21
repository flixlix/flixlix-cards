import { type ConditionContext } from "@flixlix-cards/shared/card-state";

/** The browser's screen and clock, as conditions see them on a dashboard. */
export const liveConditionContext: ConditionContext = {
  matchesMedia: (query) => matchMedia(query).matches,
  now: () => new Date(),
};
