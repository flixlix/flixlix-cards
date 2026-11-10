import { type HomeAssistant } from "custom-card-helpers";
import { getEntityNames } from "./mutli-entity";

export type EnergyPeriodKey = "today" | "yesterday" | "week" | "month" | "year";

type StatisticsValue = {
  change?: number | null;
  sum?: number | null;
};

type PeriodStatisticsResponse = Record<string, StatisticsValue[]>;

export type EnergyPeriodWindow = {
  key: EnergyPeriodKey;
  start: Date;
  end: Date;
};

const ENERGY_COLLECTION_KEY_PREFIX = "energy_";

type PropertyWatcher = { listeners: Set<() => void>; cleanup?: () => void };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// The listener set and the watcher map are only ever written by this module (possibly from
// another card bundle running the same code), so their element shapes are known.
const isListenerSet = (value: unknown): value is Set<() => void> => value instanceof Set;
const isPropertyWatchers = (value: unknown): value is Record<string, PropertyWatcher> =>
  isObject(value);

const isFossilEnergyConsumption = (value: unknown): value is FossilEnergyConsumption =>
  isObject(value) && Object.values(value).every((amount) => typeof amount === "number");

/** The HA frontend attaches energy collections as ad-hoc properties of the websocket connection. */
const getConnection = (hass: HomeAssistant): Record<string, unknown> | null => {
  const connection: unknown = hass.connection;
  return isObject(connection) ? connection : null;
};

const getStartOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const getEndOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getStartOfWeek = (date: Date): Date => {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  return start;
};

const getPeriodWindow = (period: EnergyPeriodKey): EnergyPeriodWindow => {
  const now = new Date();

  if (period === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return {
      key: period,
      start: getStartOfDay(yesterday),
      end: getEndOfDay(yesterday),
    };
  }

  if (period === "week") {
    return {
      key: period,
      start: getStartOfWeek(now),
      end: getEndOfDay(now),
    };
  }

  if (period === "month") {
    return {
      key: period,
      start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      end: getEndOfDay(now),
    };
  }

  if (period === "year") {
    return {
      key: period,
      start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      end: getEndOfDay(now),
    };
  }

  return {
    key: "today",
    start: getStartOfDay(now),
    end: getEndOfDay(now),
  };
};

const resolveConnectionKey = (hass: HomeAssistant, collectionKey?: string): string => {
  if (collectionKey) {
    return `_${collectionKey}`;
  }
  if (hass.panelUrl) {
    return `_${ENERGY_COLLECTION_KEY_PREFIX}${hass.panelUrl}`;
  }
  return "_energy";
};

const getSuggestedPeriod = (start: Date, end: Date): "hour" | "day" | "month" => {
  const dayDifference = Math.floor((end.getTime() - start.getTime()) / 86400000);
  if (dayDifference > 35 && start.getDate() === 1) {
    return "month";
  }
  if (dayDifference > 2) {
    return "day";
  }
  return "hour";
};

/** HA stores its presets as `today`, `this_week`, …; older versions stored `week`, … */
const toEnergyPeriodKey = (stored: string | null): EnergyPeriodKey | undefined => {
  const key = stored?.replace(/^this_/, "");
  return key === "today" ||
    key === "yesterday" ||
    key === "week" ||
    key === "month" ||
    key === "year"
    ? key
    : undefined;
};

/** The localStorage key under which HA remembers the last picked preset of a collection. */
export const energyDefaultPeriodStorageKey = (hass: HomeAssistant, collectionKey?: string) =>
  `energy-default-period-${resolveConnectionKey(hass, collectionKey)}`;

/** The parts of HA's energy collection a period selector drives. */
export type EnergyPeriodControls = {
  start: Date;
  end?: Date;
  /** `"previous"`/`"yoy"` while comparing, `""` otherwise; a boolean in older HA. */
  compare?: unknown;
  setPeriod: (start: Date, end?: Date) => void;
  setCompare: (mode: string) => void;
  refresh: () => unknown;
};

const isEnergyPeriodControls = (value: unknown): value is EnergyPeriodControls =>
  isObject(value) &&
  value.start instanceof Date &&
  typeof value.setPeriod === "function" &&
  typeof value.setCompare === "function" &&
  typeof value.refresh === "function";

/**
 * The energy collection HA's own energy cards created for this dashboard. Never creates one:
 * a collection created by a card bundles a copy of HA's data loader, which breaks as soon as
 * HA changes its energy preferences.
 */
export const findEnergyCollection = (
  hass: HomeAssistant,
  collectionKey?: string
): EnergyPeriodControls | null => {
  const connection = getConnection(hass);
  for (const key of [resolveConnectionKey(hass, collectionKey), "_energy"]) {
    const candidate = connection?.[key];
    if (isEnergyPeriodControls(candidate)) {
      return candidate;
    }
  }
  return null;
};

export const getGlobalEnergyPeriodWindow = (
  hass: HomeAssistant,
  collectionKey?: string
): EnergyPeriodWindow | null => {
  const connection = getConnection(hass);
  const connectionKey = resolveConnectionKey(hass, collectionKey);
  const collectionKeysToCheck = [connectionKey, "_energy"];

  for (const key of collectionKeysToCheck) {
    const maybeCollection = connection?.[key];
    if (
      isObject(maybeCollection) &&
      maybeCollection.start instanceof Date &&
      maybeCollection.end instanceof Date
    ) {
      return {
        key: "today",
        start: maybeCollection.start,
        end: maybeCollection.end,
      };
    }
  }

  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }

  let period: EnergyPeriodKey = "today";
  for (const key of collectionKeysToCheck) {
    const stored = toEnergyPeriodKey(localStorage.getItem(`energy-default-period-${key}`));
    if (stored) {
      period = stored;
      break;
    }
  }

  if (period === "today" && new Date().getHours() === 0) {
    period = "yesterday";
  }

  return getPeriodWindow(period);
};

const getEnergyCollection = (
  hass: HomeAssistant,
  collectionKey?: string
): Record<string, unknown> | null => {
  const connection = getConnection(hass);
  const keysToCheck = [resolveConnectionKey(hass, collectionKey), "_energy"];
  for (const key of keysToCheck) {
    const candidate = connection?.[key];
    if (isObject(candidate)) {
      return candidate;
    }
  }
  return null;
};

const notifyCollectionListeners = (collection: Record<string, unknown>) => {
  const listeners = collection.__efcpListeners;
  if (isListenerSet(listeners)) {
    listeners.forEach((listener) => listener());
  }
};

const wrapCollectionMethod = (
  collection: Record<string, unknown>,
  method: "setPeriod" | "setCompare" | "refresh",
  originalKey: string
) => {
  const original = collection[method];
  if (typeof original !== "function" || collection[originalKey]) {
    return;
  }
  collection[originalKey] = original;
  collection[method] = function (this: unknown, ...args: unknown[]): unknown {
    const result: unknown = original.apply(this, args);
    notifyCollectionListeners(collection);
    return result;
  };
};

const getPropertyWatchers = (
  connection: Record<string, unknown>
): Record<string, PropertyWatcher> | undefined => {
  const watchers = connection.__efcpPropertyWatchers;
  return isPropertyWatchers(watchers) ? watchers : undefined;
};

export const watchGlobalEnergyPeriodChanges = (
  hass: HomeAssistant,
  callback: () => void,
  collectionKey?: string
): (() => void) | null => {
  const connection = getConnection(hass);
  if (!connection) {
    return null;
  }
  const keysToWatch = [resolveConnectionKey(hass, collectionKey), "_energy"];
  const unsubs: Array<() => void> = [];
  const attachedCollections = new WeakSet<Record<string, unknown>>();

  const attachToCollection = (collection: Record<string, unknown>) => {
    const listeners = isListenerSet(collection.__efcpListeners)
      ? collection.__efcpListeners
      : new Set<() => void>();
    collection.__efcpListeners = listeners;
    wrapCollectionMethod(collection, "setPeriod", "__efcpOriginalSetPeriod");
    wrapCollectionMethod(collection, "setCompare", "__efcpOriginalSetCompare");
    wrapCollectionMethod(collection, "refresh", "__efcpOriginalRefresh");
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  };

  const handleChange = () => {
    const current = getEnergyCollection(hass, collectionKey);
    if (current && !attachedCollections.has(current)) {
      unsubs.push(attachToCollection(current));
      attachedCollections.add(current);
    }
    callback();
  };

  const watchers = getPropertyWatchers(connection) ?? {};
  connection.__efcpPropertyWatchers = watchers;

  for (const key of keysToWatch) {
    const existing = connection[key];
    if (isObject(existing)) {
      unsubs.push(attachToCollection(existing));
      attachedCollections.add(existing);
    }

    const watcher = watchers[key] ?? {
      listeners: new Set<() => void>(),
    };
    watcher.listeners.add(handleChange);

    if (!watcher.cleanup) {
      const descriptor = Object.getOwnPropertyDescriptor(connection, key);
      let currentValue = connection[key];
      if (!descriptor || descriptor.configurable) {
        Object.defineProperty(connection, key, {
          configurable: true,
          enumerable: true,
          get() {
            return currentValue;
          },
          set(value: unknown) {
            currentValue = value;
            getPropertyWatchers(connection)?.[key]?.listeners.forEach((listener) => listener());
          },
        });
        watcher.cleanup = () => {
          if (descriptor) {
            Object.defineProperty(connection, key, descriptor);
          } else {
            delete connection[key];
            if (currentValue !== undefined) {
              connection[key] = currentValue;
            }
          }
        };
      }
    }

    watchers[key] = watcher;
  }

  return () => {
    unsubs.forEach((unsub) => unsub());
    const currentWatchers = getPropertyWatchers(connection);
    for (const key of keysToWatch) {
      const watcher = currentWatchers?.[key];
      watcher?.listeners.delete(handleChange);
      if (watcher && watcher.listeners.size === 0) {
        watcher.cleanup?.();
        delete currentWatchers?.[key];
      }
    }
  };
};

const getSumGrowth = (values: StatisticsValue[]): number => {
  if (!values.length) {
    return 0;
  }
  let changeGrowth = 0;
  let hasChange = false;
  for (const value of values) {
    if (value.change === null || value.change === undefined) {
      continue;
    }
    changeGrowth += value.change;
    hasChange = true;
  }
  if (hasChange) {
    return Math.max(changeGrowth, 0);
  }
  const sums = values.flatMap((item) =>
    item.sum === null || item.sum === undefined ? [] : [item.sum]
  );
  const first = sums[0];
  const last = sums[sums.length - 1];
  if (first === undefined || first === null || last === undefined || last === null) {
    return 0;
  }
  return Math.max(last - first, 0);
};

export const fetchEnergyPeriodGrowth = async (
  hass: HomeAssistant,
  statisticIds: string[],
  window: EnergyPeriodWindow
): Promise<Record<string, number>> => {
  if (!statisticIds.length) {
    return {};
  }

  const raw = await hass.callWS<PeriodStatisticsResponse>({
    type: "recorder/statistics_during_period",
    start_time: window.start.toISOString(),
    end_time: window.end.toISOString(),
    statistic_ids: statisticIds,
    period: getSuggestedPeriod(window.start, window.end),
    types: ["change", "sum"],
    units: { energy: "Wh" },
  });

  const result: Record<string, number> = {};
  for (const statisticId of statisticIds) {
    result[statisticId] = getSumGrowth(raw[statisticId] ?? []);
  }
  return result;
};

export const getEntityEnergyFromGrowthMap = (
  growthMap: Record<string, number>,
  entity?: string
): number => {
  if (!entity) {
    return 0;
  }
  return getEntityNames(entity).reduce((sum, entityId) => sum + (growthMap[entityId] ?? 0), 0);
};

export type FossilEnergyConsumption = Record<string, number>;

export type EnergyCollectionFossilData = {
  co2SignalEntity?: string;
  fossilEnergyConsumption?: FossilEnergyConsumption;
};

export const subscribeEnergyCollectionData = (
  hass: HomeAssistant,
  callback: (data: EnergyCollectionFossilData) => void,
  collectionKey?: string
): (() => void) | null => {
  const collection = getEnergyCollection(hass, collectionKey);
  const subscribe = collection?.subscribe;
  if (typeof subscribe !== "function") {
    return null;
  }

  const unsub: unknown = subscribe.call(collection, (data: unknown) => {
    const co2SignalEntity = isObject(data) ? data.co2SignalEntity : undefined;
    const fossilEnergyConsumption = isObject(data) ? data.fossilEnergyConsumption : undefined;
    callback({
      co2SignalEntity: typeof co2SignalEntity === "string" ? co2SignalEntity : undefined,
      fossilEnergyConsumption: isFossilEnergyConsumption(fossilEnergyConsumption)
        ? fossilEnergyConsumption
        : undefined,
    });
  });

  return typeof unsub === "function"
    ? () => {
        Reflect.apply(unsub, undefined, []);
      }
    : null;
};

/**
 * The fossil share of the grid import over the window, in kWh per bucket, as HA's own energy
 * collection computes it. For pages where no HA energy card created a collection to read it from.
 */
export const fetchFossilEnergyConsumption = async (
  hass: HomeAssistant,
  gridImportIds: string[],
  co2StatisticId: string,
  window: EnergyPeriodWindow
): Promise<FossilEnergyConsumption | undefined> => {
  if (!gridImportIds.length) {
    return undefined;
  }
  const raw = await hass.callWS<unknown>({
    type: "energy/fossil_energy_consumption",
    start_time: window.start.toISOString(),
    end_time: window.end.toISOString(),
    energy_statistic_ids: gridImportIds,
    co2_statistic_id: co2StatisticId,
    period: getSuggestedPeriod(window.start, window.end),
  });
  return isFossilEnergyConsumption(raw) ? raw : undefined;
};

export const computeNonFossilFromCollection = (
  fossilEnergyConsumption: FossilEnergyConsumption,
  gridFromGridWh: number
): { nonFossilEnergy: number; nonFossilPercentage: number } => {
  const highCarbonEnergyWh =
    Object.values(fossilEnergyConsumption).reduce((sum, a) => sum + a, 0) * 1000;
  const nonFossilEnergy = Math.max(gridFromGridWh - highCarbonEnergyWh, 0);
  const nonFossilPercentage = gridFromGridWh > 0 ? (nonFossilEnergy / gridFromGridWh) * 100 : 0;
  return { nonFossilEnergy, nonFossilPercentage };
};
