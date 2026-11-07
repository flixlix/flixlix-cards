import { type HomeAssistant, NumberFormat, TimeFormat } from "custom-card-helpers";
import { type Connection, type HassEntity, type MessageBase } from "home-assistant-js-websocket";
import { vi } from "vite-plus/test";

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
  setPeriod: (start: Date, end: Date) => void;
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
    setPeriod(nextStart, nextEnd) {
      this.start = nextStart;
      this.end = nextEnd;
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

const fakeConnection = (options: FakeHassOptions): Connection => {
  const templates = options.templates ?? {};
  const connection: Partial<Connection> & { _energy?: FakeEnergyCollection } = {
    subscribeMessage: vi.fn(async (callback: (result: unknown) => void, message: MessageBase) => {
      const template = String(message.template);
      if (message.type === "render_template" && template in templates) {
        callback({
          result: templates[template],
          listeners: { all: false, domains: [], entities: [], time: false },
        });
      }
      return async () => undefined;
    }),
    ...(options.energyCollection ? { _energy: options.energyCollection } : {}),
  };
  return connection as Connection;
};

/** A Home Assistant frontend object for mounting cards without Home Assistant. */
export const fakeHass = (options: FakeHassOptions = {}): HomeAssistant => {
  const statistics = options.statistics ?? {};
  const callWS = vi.fn(async (message: MessageBase) => {
    if (message.type !== "recorder/statistics_during_period") {
      throw new Error(`fakeHass: unexpected websocket message ${message.type}`);
    }
    return statisticsResponse(statistics, message);
  });
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
    callService: vi.fn(async () => undefined),
  };
  return hass as HomeAssistant;
};
