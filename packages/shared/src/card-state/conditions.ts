import { type HomeAssistant } from "custom-card-helpers";

/**
 * Conditions in the format of a Home Assistant card's visibility tab. Home Assistant does not let
 * custom cards use its own checker, so this checks the same conditions.
 */
export type Condition =
  | {
      condition: "state";
      entity: string;
      state?: string | string[];
      state_not?: string | string[];
    }
  | {
      condition: "numeric_state";
      entity: string;
      /** A number, or an entity whose state is one. */
      above?: number | string;
      below?: number | string;
    }
  | { condition: "screen"; media_query: string }
  | { condition: "user"; users: string[] }
  | {
      condition: "time";
      /** "HH:MM" or "HH:MM:SS"; a range past midnight when `after` is later than `before`. */
      after?: string;
      before?: string;
      weekdays?: Weekday[];
    }
  /** Where the person of whoever looks at the card is: `home`, `not_home` or a zone's name. */
  | { condition: "location"; locations: string[] }
  | { condition: "and" | "or" | "not"; conditions: Condition[] };

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** What a condition may look at besides `hass`: the screen, for `screen`, and the time, for `time`. */
export type ConditionContext = { matchesMedia: (query: string) => boolean; now: () => Date };

const asList = (value: string | string[] | undefined) =>
  value === undefined || Array.isArray(value) ? value : [value];

const stateOf = (hass: HomeAssistant, entity: string) => hass.states[entity]?.state;

/** A threshold as a number: itself, or the numeric state of the entity it names. */
const threshold = (hass: HomeAssistant, value: number | string | undefined) => {
  if (value === undefined) {
    return undefined;
  }
  const number = Number(typeof value === "string" ? (stateOf(hass, value) ?? value) : value);
  return Number.isFinite(number) ? number : undefined;
};

const numericStateMet = (
  hass: HomeAssistant,
  { entity, above, below }: { entity: string; above?: number | string; below?: number | string }
) => {
  const state = Number(stateOf(hass, entity));
  const [min, max] = [threshold(hass, above), threshold(hass, below)];
  return (
    stateOf(hass, entity) !== undefined &&
    Number.isFinite(state) &&
    (min === undefined || state > min) &&
    (max === undefined || state < max)
  );
};

const stateMet = (
  hass: HomeAssistant,
  condition: { entity: string; state?: string | string[]; state_not?: string | string[] }
) => {
  const state = stateOf(hass, condition.entity);
  const is = asList(condition.state);
  const isNot = asList(condition.state_not);
  return (
    state !== undefined &&
    (is === undefined || is.includes(state)) &&
    (isNot === undefined || !isNot.includes(state))
  );
};

const WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Seconds since midnight of "HH:MM" or "HH:MM:SS". */
const secondsOf = (time: string) => {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

const timeMet = (
  { after, before, weekdays }: { after?: string; before?: string; weekdays?: Weekday[] },
  now: Date
) => {
  const day = WEEKDAYS[now.getDay()];
  if (weekdays && weekdays.length > 0 && (day === undefined || !weekdays.includes(day))) {
    return false;
  }
  const time = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const [start, end] = [after === undefined ? 0 : secondsOf(after), before];
  if (end === undefined) {
    return time >= start;
  }
  const until = secondsOf(end);
  return start <= until ? time >= start && time < until : time >= start || time < until;
};

/** Where the person of the user looking at the card is, by their person entity. */
const userLocation = (hass: HomeAssistant) =>
  Object.values(hass.states).find(
    (entity) =>
      entity.entity_id.startsWith("person.") &&
      hass.user?.id !== undefined &&
      entity.attributes.user_id === hass.user.id
  )?.state;

/**
 * Whether one condition holds. Kinds a card cannot check by itself, as they need Home
 * Assistant's backend (template, sun, zone, device), are ignored: they always hold.
 */
export const conditionMet = (
  condition: Condition,
  hass: HomeAssistant,
  context: ConditionContext
): boolean => {
  switch (condition.condition) {
    case "state":
      return stateMet(hass, condition);
    case "numeric_state":
      return numericStateMet(hass, condition);
    case "screen":
      return context.matchesMedia(condition.media_query);
    case "user":
      return condition.users.includes(hass.user?.id ?? "");
    case "time":
      return timeMet(condition, context.now());
    case "location":
      return condition.locations.includes(userLocation(hass) ?? "");
    case "and":
      return conditionsMet(condition.conditions, hass, context);
    case "or":
      return condition.conditions.some((inner) => conditionMet(inner, hass, context));
    case "not":
      return !conditionsMet(condition.conditions, hass, context);
    default:
      return true;
  }
};

/** Whether every condition holds; an empty list always does. */
export const conditionsMet = (
  conditions: Condition[],
  hass: HomeAssistant,
  context: ConditionContext
): boolean => conditions.every((condition) => conditionMet(condition, hass, context));

/** The entities one condition reads: its own, an entity threshold's, or its inner conditions'. */
const entitiesOf = (condition: Condition): string[] => {
  if (condition.condition === "state") {
    return [condition.entity];
  }
  if (condition.condition === "numeric_state") {
    return [condition.entity, condition.above, condition.below].filter(
      (id): id is string => typeof id === "string" && id.includes(".")
    );
  }
  return "conditions" in condition ? conditionEntities(condition.conditions) : [];
};

/** The entities conditions read, so a card redraws when one of them changes. */
export const conditionEntities = (conditions: Condition[] = []): string[] =>
  conditions.flatMap(entitiesOf);
