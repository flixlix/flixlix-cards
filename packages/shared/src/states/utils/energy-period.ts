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

type EnergyCollectionLike = {
  start?: Date;
  end?: Date;
  setPeriod?: (newStart: Date, newEnd?: Date) => void;
  setCompare?: (compare: unknown) => void;
  refresh?: () => void;
};

type ListenerCollection = EnergyCollectionLike & {
  __efcpListeners?: Set<() => void>;
  __efcpOriginalSetPeriod?: EnergyCollectionLike["setPeriod"];
  __efcpOriginalSetCompare?: EnergyCollectionLike["setCompare"];
  __efcpOriginalRefresh?: EnergyCollectionLike["refresh"];
};

type WatchableConnection = Record<string, unknown> & {
  __efcpPropertyWatchers?: Record<string, { listeners: Set<() => void>; cleanup?: () => void }>;
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

export const getGlobalEnergyPeriodWindow = (
  hass: HomeAssistant,
  collectionKey?: string
): EnergyPeriodWindow | null => {
  const connection = hass.connection as unknown as Record<string, unknown>;
  const connectionKey = resolveConnectionKey(hass, collectionKey);
  const collectionKeysToCheck = [connectionKey, "_energy"];

  for (const key of collectionKeysToCheck) {
    const maybeCollection = connection?.[key] as EnergyCollectionLike | undefined;
    if (maybeCollection?.start instanceof Date && maybeCollection?.end instanceof Date) {
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
    const stored = localStorage.getItem(`energy-default-period-${key}`);
    if (
      stored === "today" ||
      stored === "yesterday" ||
      stored === "week" ||
      stored === "month" ||
      stored === "year"
    ) {
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
): ListenerCollection | null => {
  const connection = hass.connection as unknown as Record<string, unknown>;
  const keysToCheck = [resolveConnectionKey(hass, collectionKey), "_energy"];
  for (const key of keysToCheck) {
    const candidate = connection?.[key] as ListenerCollection | undefined;
    if (candidate) return candidate;
  }
  return null;
};

export const watchGlobalEnergyPeriodChanges = (
  hass: HomeAssistant,
  callback: () => void,
  collectionKey?: string
): (() => void) | null => {
  const connection = hass.connection as unknown as WatchableConnection;
  const keysToWatch = [resolveConnectionKey(hass, collectionKey), "_energy"];
  const unsubs: Array<() => void> = [];
  const attachedCollections = new WeakSet<ListenerCollection>();

  const attachToCollection = (collection: ListenerCollection) => {
    if (!collection.__efcpListeners) {
      collection.__efcpListeners = new Set();
    }
    if (collection.setPeriod && !collection.__efcpOriginalSetPeriod) {
      collection.__efcpOriginalSetPeriod = collection.setPeriod;
      collection.setPeriod = function (newStart: Date, newEnd?: Date) {
        const result = collection.__efcpOriginalSetPeriod?.call(this, newStart, newEnd);
        collection.__efcpListeners?.forEach((listener) => listener());
        return result;
      };
    }
    if (collection.setCompare && !collection.__efcpOriginalSetCompare) {
      collection.__efcpOriginalSetCompare = collection.setCompare;
      collection.setCompare = function (compare: unknown) {
        const result = collection.__efcpOriginalSetCompare?.call(this, compare);
        collection.__efcpListeners?.forEach((listener) => listener());
        return result;
      };
    }
    if (collection.refresh && !collection.__efcpOriginalRefresh) {
      collection.__efcpOriginalRefresh = collection.refresh;
      collection.refresh = function () {
        const result = collection.__efcpOriginalRefresh?.call(this);
        collection.__efcpListeners?.forEach((listener) => listener());
        return result;
      };
    }
    collection.__efcpListeners.add(callback);
    return () => {
      collection.__efcpListeners?.delete(callback);
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

  if (!connection.__efcpPropertyWatchers) {
    connection.__efcpPropertyWatchers = {};
  }

  for (const key of keysToWatch) {
    const existing = connection[key] as ListenerCollection | undefined;
    if (existing) {
      unsubs.push(attachToCollection(existing));
      attachedCollections.add(existing);
    }

    const watcher = connection.__efcpPropertyWatchers[key] ?? {
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
          set(value) {
            currentValue = value;
            const listeners = connection.__efcpPropertyWatchers?.[key]?.listeners;
            listeners?.forEach((listener) => listener());
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

    connection.__efcpPropertyWatchers[key] = watcher;
  }

  return () => {
    unsubs.forEach((unsub) => unsub());
    for (const key of keysToWatch) {
      const watcher = connection.__efcpPropertyWatchers?.[key];
      watcher?.listeners.delete(handleChange);
      if (watcher && watcher.listeners.size === 0) {
        watcher.cleanup?.();
        delete connection.__efcpPropertyWatchers?.[key];
      }
    }
  };
};

const getSumGrowth = (values: StatisticsValue[]): number => {
  if (!values.length) return 0;
  let changeGrowth = 0;
  let hasChange = false;
  for (const value of values) {
    if (value.change === null || value.change === undefined) continue;
    changeGrowth += value.change;
    hasChange = true;
  }
  if (hasChange) return Math.max(changeGrowth, 0);
  const first = values.find((item) => item.sum !== null && item.sum !== undefined)?.sum;
  const last = [...values]
    .reverse()
    .find((item) => item.sum !== null && item.sum !== undefined)?.sum;
  if (first === undefined || first === null || last === undefined || last === null) return 0;
  return Math.max(last - first, 0);
};

export const fetchEnergyPeriodGrowth = async (
  hass: HomeAssistant,
  statisticIds: string[],
  window: EnergyPeriodWindow
): Promise<Record<string, number>> => {
  if (!statisticIds.length) return {};

  const raw = (await hass.callWS({
    type: "recorder/statistics_during_period",
    start_time: window.start.toISOString(),
    end_time: window.end.toISOString(),
    statistic_ids: statisticIds,
    period: getSuggestedPeriod(window.start, window.end),
    types: ["change", "sum"],
    units: { energy: "Wh" },
  })) as PeriodStatisticsResponse;

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
  if (!entity) return 0;
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
  const collection = getEnergyCollection(hass, collectionKey) as Record<string, unknown> | null;
  if (!collection || typeof collection.subscribe !== "function") {
    return null;
  }

  const unsub = (
    collection.subscribe as (cb: (data: Record<string, unknown>) => void) => () => void
  )((data) => {
    callback({
      co2SignalEntity: data?.co2SignalEntity as string | undefined,
      fossilEnergyConsumption: data?.fossilEnergyConsumption as FossilEnergyConsumption | undefined,
    });
  });

  return typeof unsub === "function" ? unsub : null;
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
