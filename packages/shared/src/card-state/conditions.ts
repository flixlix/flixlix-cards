import { type HomeAssistant } from "custom-card-helpers";
import { type LocationCondition, locationMet } from "./location";

/**
 * Conditions in the format of a Home Assistant card's visibility tab. Since Home Assistant
 * 2026.10 its editor writes `state` and `numeric_state` in the format of an automation
 * (`entity_id`), offers its other conditions too, and Home Assistant checks those itself; the
 * older format, with `entity`, is still read.
 */
export type Condition = (
  | {
      condition: "state";
      entity: string;
      state?: string | string[];
      state_not?: string | string[];
    }
  | {
      condition: "state";
      entity_id: string | string[];
      state: string | string[];
      attribute?: string;
      match?: "all" | "any";
    }
  | {
      condition: "numeric_state";
      entity: string;
      /** A number, or an entity whose state is one. */
      above?: number | string;
      below?: number | string;
    }
  | {
      condition: "numeric_state";
      entity_id: string | string[];
      above?: number | string;
      below?: number | string;
      attribute?: string;
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
  | LocationCondition
  | { condition: "and" | "or" | "not"; conditions: Condition[] }
  /** Only Home Assistant can check these; integrations add more. */
  | { condition: "zone" | "sun" | "template" | "device"; [option: string]: unknown }
) & { enabled?: boolean };

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/**
 * Home Assistant's own verdict on a condition: whether it holds, `"pending"` until it has said,
 * or `"local"` when it cannot say (before 2026.10) and the card checks the condition itself.
 */
export type ServerVerdict = boolean | "pending" | "local";

/** What a condition may look at besides `hass`: the screen, for `screen`, and the time, for `time`. */
export type ConditionContext = {
  matchesMedia: (query: string) => boolean;
  now: () => Date;
  /** Home Assistant's verdicts on the conditions of {@link serverConditions}. */
  server?: (condition: Condition) => ServerVerdict;
};

/** Whether a condition holds, or undefined while Home Assistant has not said. */
type Verdict = boolean | undefined;

const CLIENT_CONDITIONS = new Set(["screen", "user", "time", "location", "view_columns"]);

const asList = (value: string | string[] | undefined): string[] | undefined =>
  value === undefined || Array.isArray(value) ? value : [value];

const stateOf = (hass: HomeAssistant, entity: string) => hass.states[entity]?.state;

/** An entity's state, or one of its attributes, as conditions compare it: as text. */
const valueOf = (hass: HomeAssistant, entity: string, attribute: string | undefined) => {
  const value: unknown =
    attribute === undefined ? stateOf(hass, entity) : hass.states[entity]?.attributes[attribute];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : undefined;
};

/** A threshold as a number: itself, or the numeric state of the entity it names. */
const threshold = (hass: HomeAssistant, value: number | string | undefined) => {
  if (value === undefined) {
    return undefined;
  }
  const number = Number(typeof value === "string" ? (stateOf(hass, value) ?? value) : value);
  return Number.isFinite(number) ? number : undefined;
};

const between = (
  hass: HomeAssistant,
  value: string | undefined,
  above?: number | string,
  below?: number | string
) => {
  const number = Number(value);
  const [min, max] = [threshold(hass, above), threshold(hass, below)];
  return (
    value !== undefined &&
    Number.isFinite(number) &&
    (min === undefined || number > min) &&
    (max === undefined || number < max)
  );
};

const stateMet = (state: string | undefined, is: string[] | undefined, isNot?: string[]) =>
  state !== undefined &&
  (is === undefined || is.includes(state)) &&
  (isNot === undefined || !isNot.includes(state));

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

const isLogical = (
  condition: Condition
): condition is Extract<Condition, { condition: "and" | "or" | "not" }> =>
  condition.condition === "and" || condition.condition === "or" || condition.condition === "not";

/** Home Assistant leaves out a condition disabled in its editor. */
const enabled = (conditions: Condition[] = []) =>
  conditions.filter((condition) => condition.enabled !== false);

/**
 * Whether Home Assistant checks this condition: all but those about the viewer (screen, user,
 * time, location) and those in the older format, which the card checks as it always has.
 */
const isServerCondition = (condition: Condition): boolean => {
  if (isLogical(condition)) {
    return enabled(condition.conditions).every(isServerCondition);
  }
  if (condition.condition === "state" || condition.condition === "numeric_state") {
    return "entity_id" in condition;
  }
  return !CLIENT_CONDITIONS.has(condition.condition);
};

/** Undefined, unknown, wins neither: false decides an `and`, true an `or`. */
const allOf = (verdicts: Verdict[]): Verdict =>
  verdicts.includes(false) ? false : verdicts.includes(undefined) ? undefined : true;

const anyOf = (verdicts: Verdict[]): Verdict =>
  verdicts.includes(true) ? true : verdicts.includes(undefined) ? undefined : false;

const negate = (verdict: Verdict): Verdict => (verdict === undefined ? undefined : !verdict);

type StateCondition = Extract<Condition, { condition: "state" }>;
type NumericStateCondition = Extract<Condition, { condition: "numeric_state" }>;

const stateConditionMet = (hass: HomeAssistant, condition: StateCondition) => {
  if ("entity" in condition) {
    const state = stateOf(hass, condition.entity);
    return stateMet(state, asList(condition.state), asList(condition.state_not));
  }
  const met = (entity: string) =>
    stateMet(valueOf(hass, entity, condition.attribute), asList(condition.state));
  const entities = asList(condition.entity_id) ?? [];
  return condition.match === "any" ? entities.some(met) : entities.every(met);
};

const numericStateConditionMet = (hass: HomeAssistant, condition: NumericStateCondition) => {
  if ("entity" in condition) {
    return between(hass, stateOf(hass, condition.entity), condition.above, condition.below);
  }
  return (asList(condition.entity_id) ?? []).every((entity) =>
    between(hass, valueOf(hass, entity, condition.attribute), condition.above, condition.below)
  );
};

/** How the card checks a condition without Home Assistant. */
const localVerdict = (
  condition: Condition,
  hass: HomeAssistant,
  context: ConditionContext
): Verdict => {
  switch (condition.condition) {
    case "state":
      return stateConditionMet(hass, condition);
    case "numeric_state":
      return numericStateConditionMet(hass, condition);
    case "screen":
      return context.matchesMedia(condition.media_query);
    case "user":
      return condition.users.includes(hass.user?.id ?? "");
    case "time":
      return timeMet(condition, context.now());
    case "location":
      return locationMet(hass, condition);
    case "and":
      return allOf(verdicts(condition.conditions, hass, context));
    case "or":
      return anyOf(verdicts(condition.conditions, hass, context));
    case "not":
      return negate(allOf(verdicts(condition.conditions, hass, context)));
    case "zone":
    case "sun":
    case "template":
    case "device":
    default:
      return true;
  }
};

/**
 * Whether one condition holds. Home Assistant's verdict decides the conditions it checks; without
 * one the card checks them itself, and ignores those it cannot check (template, sun, zone,
 * device): they always hold.
 */
const verdict = (condition: Condition, hass: HomeAssistant, context: ConditionContext): Verdict => {
  const server =
    context.server && isServerCondition(condition) ? context.server(condition) : "local";
  if (server === "local") {
    return localVerdict(condition, hass, context);
  }
  return server === "pending" ? undefined : server;
};

const verdicts = (conditions: Condition[], hass: HomeAssistant, context: ConditionContext) =>
  enabled(conditions).map((condition) => verdict(condition, hass, context));

/**
 * Whether every condition holds; an empty list always does. While Home Assistant has not said
 * whether a condition it checks holds, the conditions do not hold, as on a dashboard.
 */
export const conditionsMet = (
  conditions: Condition[],
  hass: HomeAssistant,
  context: ConditionContext
): boolean => allOf(verdicts(conditions, hass, context)) === true;

/**
 * The conditions Home Assistant checks: each one, or `and`, `or` and `not` of only such
 * conditions, that is not part of a larger one.
 */
export const serverConditions = (conditions: Condition[] = []): Condition[] =>
  enabled(conditions).flatMap((condition) => {
    if (isServerCondition(condition)) {
      return [condition];
    }
    return isLogical(condition) ? serverConditions(condition.conditions) : [];
  });

/**
 * A condition as Home Assistant's automations write it. A card's `not` holds while not all of its
 * conditions hold, an automation's while none does.
 */
export const automationCondition = (condition: Condition): Condition => {
  if (!isLogical(condition)) {
    return condition;
  }
  const conditions = condition.conditions.map(automationCondition);
  return condition.condition === "not"
    ? { ...condition, conditions: [{ condition: "and", conditions }] }
    : { ...condition, conditions };
};

/** The entities one condition reads: its own, an entity threshold's, or its inner conditions'. */
const entitiesOf = (condition: Condition): string[] => {
  if (condition.condition === "state" || condition.condition === "numeric_state") {
    const own = "entity" in condition ? [condition.entity] : (asList(condition.entity_id) ?? []);
    const thresholds =
      condition.condition === "numeric_state" ? [condition.above, condition.below] : [];
    return [
      ...own,
      ...thresholds.filter((id): id is string => typeof id === "string" && id.includes(".")),
    ];
  }
  return isLogical(condition) ? conditionEntities(condition.conditions) : [];
};

/** The entities conditions read, so a card redraws when one of them changes. */
export const conditionEntities = (conditions: Condition[] = []): string[] =>
  conditions.flatMap(entitiesOf);
