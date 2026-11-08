import { type HomeAssistant, NumberFormat, TimeFormat } from "custom-card-helpers";
import { type Connection, type HassEntity, type MessageBase } from "home-assistant-js-websocket";

type SensorOptions = {
  unit?: string;
  deviceClass?: string;
  name?: string;
  attributes?: Record<string, unknown>;
};

const deviceClassOf = (unit: string | undefined) => {
  if (unit === undefined || unit === "%") {
    return undefined;
  }
  return unit.endsWith("Wh") ? "energy" : "power";
};

/** A sensor state as Home Assistant sends it; power in W unless a unit says otherwise. */
export const sensor = (
  state: string,
  options: SensorOptions = {}
): Omit<HassEntity, "entity_id"> => {
  const unit = "unit" in options ? options.unit : "W";
  return {
    state,
    attributes: {
      unit_of_measurement: unit,
      device_class: options.deviceClass ?? deviceClassOf(unit),
      state_class: "measurement",
      ...(options.name === undefined ? {} : { friendly_name: options.name }),
      ...options.attributes,
    },
    last_changed: "2026-01-01T12:00:00.000Z",
    last_updated: "2026-01-01T12:00:00.000Z",
    context: { id: "fixture", user_id: null, parent_id: null },
  };
};

/** A state per entity id: a bare string is a power sensor in W. */
export type StateFixtures = Record<string, string | Omit<HassEntity, "entity_id">>;

export type StatisticsWindow = { start: Date; end: Date };

/** Growth in Wh per statistic id over the requested window. */
export type StatisticsFixture =
  | Record<string, number>
  | ((window: StatisticsWindow) => Record<string, number> | Promise<Record<string, number>>);

/** The energy collection the HA energy dashboard attaches to the connection. */
export type FakeEnergyCollection = {
  start: Date;
  end: Date;
  compare: string;
  setPeriod: (start: Date, end: Date) => void;
  setCompare: (compare: string) => void;
  refresh: () => void;
  subscribe: (callback: (data: unknown) => void) => () => void;
};

export type FakeHassOptions = {
  states?: StateFixtures;
  language?: string;
  numberFormat?: NumberFormat;
  /** Rendered result per secondary-info template. */
  templates?: Record<string, string>;
  statistics?: StatisticsFixture;
  energyCollection?: FakeEnergyCollection;
};

export const energyCollection = (
  start: Date,
  end: Date,
  data: unknown = {}
): FakeEnergyCollection => {
  const subscribers = new Set<(data: unknown) => void>();
  return {
    start,
    end,
    compare: "",
    setPeriod(nextStart, nextEnd) {
      this.start = nextStart;
      this.end = nextEnd;
    },
    setCompare(compare) {
      this.compare = compare;
    },
    refresh() {
      subscribers.forEach((callback) => callback(data));
    },
    subscribe(callback) {
      subscribers.add(callback);
      callback(data);
      return () => subscribers.delete(callback);
    },
  };
};

const translations: Record<string, string> = {
  "ui.panel.lovelace.cards.energy.energy_distribution.battery": "Battery",
  "ui.panel.lovelace.cards.energy.energy_distribution.grid": "Grid",
  "ui.panel.lovelace.cards.energy.energy_distribution.solar": "Solar",
  "ui.panel.lovelace.cards.energy.energy_distribution.go_to_energy_dashboard":
    "Go to the energy dashboard",
  "ui.panel.lovelace.cards.energy.loading": "Loading…",
  "ui.panel.lovelace.cards.energy.no_data": "There is no data to show.",
  "ui.panel.lovelace.components.energy_period_selector.now": "Now",
  "ui.panel.lovelace.components.energy_period_selector.previous": "Previous",
  "ui.panel.lovelace.components.energy_period_selector.next": "Next",
  "ui.panel.lovelace.components.energy_period_selector.compare": "Compare data",
  "ui.components.calendar.event.rrule.day": "day",
  "ui.components.calendar.event.rrule.week": "week",
  "ui.components.calendar.event.rrule.month": "month",
  "ui.components.calendar.event.rrule.year": "year",
};

const entities = (states: StateFixtures): HomeAssistant["states"] =>
  Object.fromEntries(
    Object.entries(states).map(([entityId, fixture]) => {
      const entity = typeof fixture === "string" ? sensor(fixture) : fixture;
      return [entityId, { entity_id: entityId, ...entity }];
    })
  );

const statisticsResponse = async (
  statistics: StatisticsFixture,
  message: MessageBase
): Promise<Record<string, { change: number }[]>> => {
  const window = {
    start: new Date(String(message.start_time)),
    end: new Date(String(message.end_time)),
  };
  const growth = typeof statistics === "function" ? await statistics(window) : statistics;
  return Object.fromEntries(Object.entries(growth).map(([id, change]) => [id, [{ change }]]));
};

type TemplateSubscriber = (result: unknown) => void;

const templateSubscribers = new WeakMap<Connection, Map<string, TemplateSubscriber>>();

const renderedTemplate = (result: string) => ({
  result,
  listeners: { all: false, domains: [], entities: [], time: false },
});

/** Sends a new rendered result to the card subscribed to the template. */
export const emitTemplate = (hass: HomeAssistant, template: string, result: string): void => {
  const subscriber = templateSubscribers.get(hass.connection)?.get(template);
  if (!subscriber) {
    throw new Error(`emitTemplate: nothing subscribed to ${template}`);
  }
  subscriber(renderedTemplate(result));
};

const fakeConnection = (options: FakeHassOptions): Connection => {
  const templates = options.templates ?? {};
  const subscribers = new Map<string, TemplateSubscriber>();
  const subscribeMessage = async (callback: TemplateSubscriber, message: MessageBase) => {
    const template = String(message.template);
    if (message.type === "render_template") {
      subscribers.set(template, callback);
    }
    if (message.type === "render_template" && template in templates) {
      callback(renderedTemplate(templates[template] ?? ""));
    }
    return async () => undefined;
  };
  const connection: Partial<Connection> & { _energy?: FakeEnergyCollection } = {
    subscribeMessage: subscribeMessage as Connection["subscribeMessage"],
    ...(options.energyCollection ? { _energy: options.energyCollection } : {}),
  };
  const fake = connection as Connection;
  templateSubscribers.set(fake, subscribers);
  return fake;
};

/**
 * The next `hass` Home Assistant hands out after the given states changed: a new object in which
 * every other entity keeps its state object.
 */
export const withStates = (hass: HomeAssistant, states: StateFixtures): HomeAssistant => ({
  ...hass,
  states: { ...hass.states, ...entities(states) },
});

/** A Home Assistant frontend object for mounting cards without Home Assistant. */
export const fakeHass = (options: FakeHassOptions = {}): HomeAssistant => {
  const statistics = options.statistics ?? {};
  const callWS = async (message: MessageBase) => {
    if (message.type !== "recorder/statistics_during_period") {
      throw new Error(`fakeHass: unexpected websocket message ${message.type}`);
    }
    return statisticsResponse(statistics, message);
  };
  const hass: Partial<HomeAssistant> = {
    states: entities(options.states ?? {}),
    locale: {
      language: options.language ?? "en",
      number_format: options.numberFormat ?? NumberFormat.language,
      time_format: TimeFormat.twenty_four,
    },
    language: options.language ?? "en",
    localize: (key: string) => translations[key] ?? key,
    user: {
      id: "test-user",
      name: "Test User",
      is_admin: true,
      is_owner: true,
      credentials: [],
      mfa_modules: [],
    },
    panelUrl: "lovelace",
    connection: fakeConnection(options),
    callWS: callWS as HomeAssistant["callWS"],
    callService: async () => undefined,
  };
  return hass as HomeAssistant;
};
