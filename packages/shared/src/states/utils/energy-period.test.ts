import { type HomeAssistant } from "custom-card-helpers";
import { type Connection, type MessageBase } from "home-assistant-js-websocket";
import { fakeHass } from "../../testing/fixtures";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import {
  computeNonFossilFromCollection,
  type EnergyPeriodWindow,
  energyDefaultPeriodStorageKey,
  fetchEnergyPeriodGrowth,
  fetchFossilEnergyConsumption,
  findEnergyCollection,
  getEntityEnergyFromGrowthMap,
  getGlobalEnergyPeriodWindow,
  subscribeEnergyCollectionData,
  watchGlobalEnergyPeriodChanges,
} from "./energy-period";

/** Mirrors the shape of the energy collection the HA frontend puts on `hass.connection`. */
const fakeEnergyCollection = (start: Date, end: Date) => {
  const subscribers = new Set<(data: unknown) => void>();
  const collection = {
    start,
    end,
    setPeriod: (newStart: Date, newEnd: Date) => {
      collection.start = newStart;
      collection.end = newEnd;
    },
    setCompare: vi.fn(),
    refresh: vi.fn(),
    subscribe: (subscriber: (data: unknown) => void) => {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    publish: (data: unknown) => {
      subscribers.forEach((subscriber) => subscriber(data));
    },
  };
  return collection;
};

/** HA adds energy collections to the connection as ad-hoc `_energy*` properties. */
const fakeConnection = (collections: Record<string, unknown> = {}) =>
  Object.assign({} as Connection, collections);

const hassWithConnection = (
  collections: Record<string, unknown>,
  overrides: Partial<HomeAssistant> = {}
): HomeAssistant => fakeHass({ connection: fakeConnection(collections), ...overrides });

const hassReturning = (response: Record<string, unknown>) => {
  const callWS = vi.fn<(message: MessageBase) => void>();
  const hass = hassWithConnection(
    {},
    {
      callWS: <T>(message: MessageBase) => {
        callWS(message);
        return Promise.resolve(response as T);
      },
    }
  );
  return { hass, callWS };
};

const day = (dayOfMonth: number, hours = 0) => new Date(2024, 4, dayOfMonth, hours);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("getGlobalEnergyPeriodWindow", () => {
  test("reads the period from the default `_energy` collection", () => {
    const hass = hassWithConnection({ _energy: fakeEnergyCollection(day(1), day(2)) });

    expect(getGlobalEnergyPeriodWindow(hass)).toEqual({ key: "today", start: day(1), end: day(2) });
  });

  test("prefers the collection named by `collection_key`", () => {
    const hass = hassWithConnection({
      _energy: fakeEnergyCollection(day(1), day(2)),
      _energy_custom: fakeEnergyCollection(day(10), day(11)),
    });

    expect(getGlobalEnergyPeriodWindow(hass, "energy_custom")).toMatchObject({
      start: day(10),
      end: day(11),
    });
  });

  test("falls back to `_energy` when the keyed collection does not exist", () => {
    const hass = hassWithConnection({ _energy: fakeEnergyCollection(day(1), day(2)) });

    expect(getGlobalEnergyPeriodWindow(hass, "energy_missing")).toMatchObject({ start: day(1) });
  });

  test("uses the dashboard's own collection when no key is configured", () => {
    const hass = hassWithConnection(
      {
        _energy: fakeEnergyCollection(day(1), day(2)),
        _energy_my_dashboard: fakeEnergyCollection(day(20), day(21)),
      },
      { panelUrl: "my_dashboard" }
    );

    expect(getGlobalEnergyPeriodWindow(hass)).toMatchObject({ start: day(20) });
  });

  test("is null outside a browser when no collection exists", () => {
    expect(getGlobalEnergyPeriodWindow(hassWithConnection({}))).toBeNull();
  });

  test("falls back to the period stored by the energy date picker", () => {
    vi.useFakeTimers({ now: day(15, 12) });
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === "energy-default-period-_energy" ? "month" : null),
    });

    expect(getGlobalEnergyPeriodWindow(hassWithConnection({}))).toEqual({
      key: "month",
      start: day(1),
      end: new Date(2024, 4, 15, 23, 59, 59, 999),
    });
  });

  test("understands the `this_month` preset name current HA versions store", () => {
    vi.useFakeTimers({ now: day(15, 12) });
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === "energy-default-period-_energy" ? "this_month" : null),
    });

    expect(getGlobalEnergyPeriodWindow(hassWithConnection({}))).toMatchObject({
      key: "month",
      start: day(1),
    });
  });

  test("shows yesterday instead of an empty today during the first hour of the day", () => {
    vi.useFakeTimers({ now: day(15, 0) });
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => null });

    expect(getGlobalEnergyPeriodWindow(hassWithConnection({}))).toEqual({
      key: "yesterday",
      start: day(14),
      end: new Date(2024, 4, 14, 23, 59, 59, 999),
    });
  });
});

describe("watchGlobalEnergyPeriodChanges", () => {
  test("is null without a connection", () => {
    expect(watchGlobalEnergyPeriodChanges(fakeHass(), vi.fn())).toBeNull();
  });

  test("notifies when the period selector changes the period", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const hass = hassWithConnection({ _energy: collection });
    const onChange = vi.fn();
    watchGlobalEnergyPeriodChanges(hass, onChange);

    collection.setPeriod(day(3), day(4));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(getGlobalEnergyPeriodWindow(hass)).toMatchObject({ start: day(3), end: day(4) });
  });

  test("still runs the collection's own setPeriod, refresh and setCompare", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const { refresh, setCompare } = collection;
    watchGlobalEnergyPeriodChanges(hassWithConnection({ _energy: collection }), vi.fn());

    collection.setPeriod(day(3), day(4));
    collection.refresh();
    collection.setCompare(true);

    expect(collection.start).toEqual(day(3));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(setCompare).toHaveBeenCalledWith(true);
  });

  test("notifies on refresh and compare toggles", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const onChange = vi.fn();
    watchGlobalEnergyPeriodChanges(hassWithConnection({ _energy: collection }), onChange);

    collection.refresh();
    collection.setCompare(true);

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test("picks up a collection the frontend creates after the card subscribed", () => {
    const connection = fakeConnection();
    const onChange = vi.fn();
    watchGlobalEnergyPeriodChanges(fakeHass({ connection }), onChange);

    const collection = fakeEnergyCollection(day(1), day(2));
    connection._energy = collection;
    expect(onChange).toHaveBeenCalledTimes(1);

    collection.setPeriod(day(3), day(4));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test("follows the collection HA publishes after its bare websocket collection", () => {
    const connection = fakeConnection();
    const onChange = vi.fn();
    watchGlobalEnergyPeriodChanges(fakeHass({ connection }), onChange);

    // HA's getEnergyDataCollection(): getCollection() first stores a bare collection,
    // then HA replaces it with the full energy collection.
    const {
      setPeriod: _setPeriod,
      start: _start,
      end: _end,
      ...bareCollection
    } = fakeEnergyCollection(day(1), day(2));
    connection._energy = bareCollection;
    const collection = fakeEnergyCollection(day(1), day(2));
    connection._energy = collection;
    onChange.mockClear();

    collection.setPeriod(day(3), day(4));

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("watches the keyed collection", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const onChange = vi.fn();
    watchGlobalEnergyPeriodChanges(
      hassWithConnection({ _energy_custom: collection }),
      onChange,
      "energy_custom"
    );

    collection.setPeriod(day(3), day(4));

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("stops notifying after unsubscribing", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const connection = fakeConnection({ _energy: collection });
    const onChange = vi.fn();
    const unsubscribe = watchGlobalEnergyPeriodChanges(fakeHass({ connection }), onChange);

    unsubscribe?.();
    collection.setPeriod(day(3), day(4));
    connection._energy = fakeEnergyCollection(day(5), day(6));

    expect(onChange).not.toHaveBeenCalled();
    expect(connection._energy).toMatchObject({ start: day(5) });
  });

  test("keeps notifying other cards when one card unsubscribes", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const hass = hassWithConnection({ _energy: collection });
    const firstCard = vi.fn();
    const secondCard = vi.fn();
    const unsubscribeFirst = watchGlobalEnergyPeriodChanges(hass, firstCard);
    watchGlobalEnergyPeriodChanges(hass, secondCard);

    unsubscribeFirst?.();
    collection.setPeriod(day(3), day(4));

    expect(firstCard).not.toHaveBeenCalled();
    expect(secondCard).toHaveBeenCalledTimes(1);
  });
});

describe("fetchEnergyPeriodGrowth", () => {
  const todayWindow: EnergyPeriodWindow = {
    key: "today",
    start: day(15),
    end: new Date(2024, 4, 15, 23, 59, 59, 999),
  };

  test("does not query the recorder without statistic ids", async () => {
    const { hass, callWS } = hassReturning({});

    expect(await fetchEnergyPeriodGrowth(hass, [], todayWindow)).toEqual({});
    expect(callWS).not.toHaveBeenCalled();
  });

  test("queries hourly statistics in Wh for a single day", async () => {
    const { hass, callWS } = hassReturning({});

    await fetchEnergyPeriodGrowth(hass, ["sensor.grid"], todayWindow);

    expect(callWS).toHaveBeenCalledWith({
      type: "recorder/statistics_during_period",
      start_time: todayWindow.start.toISOString(),
      end_time: todayWindow.end.toISOString(),
      statistic_ids: ["sensor.grid"],
      period: "hour",
      types: ["change", "sum"],
      units: { energy: "Wh" },
    });
  });

  test.each([
    { name: "a week", start: day(13), end: day(19), period: "day" },
    { name: "a month", start: day(1), end: day(31), period: "day" },
    { name: "a year", start: new Date(2024, 0, 1), end: day(31), period: "month" },
  ])("queries $period statistics for $name", async ({ start, end, period }) => {
    const { hass, callWS } = hassReturning({});

    await fetchEnergyPeriodGrowth(hass, ["sensor.grid"], { key: "today", start, end });

    expect(callWS).toHaveBeenCalledWith(expect.objectContaining({ period }));
  });

  test("sums the change of every bucket, ignoring empty ones", async () => {
    const { hass } = hassReturning({
      "sensor.grid": [{ change: 100 }, { change: null }, { change: 250, sum: 9999 }],
    });

    expect(await fetchEnergyPeriodGrowth(hass, ["sensor.grid"], todayWindow)).toEqual({
      "sensor.grid": 350,
    });
  });

  test("falls back to the difference of the first and last sum without changes", async () => {
    const { hass } = hassReturning({
      "sensor.grid": [{ sum: 1000 }, { sum: null }, { sum: 1400 }],
    });

    expect(await fetchEnergyPeriodGrowth(hass, ["sensor.grid"], todayWindow)).toEqual({
      "sensor.grid": 400,
    });
  });

  test("never reports negative growth", async () => {
    const { hass } = hassReturning({
      "sensor.by_change": [{ change: -50 }],
      "sensor.by_sum": [{ sum: 500 }, { sum: 100 }],
    });

    expect(
      await fetchEnergyPeriodGrowth(hass, ["sensor.by_change", "sensor.by_sum"], todayWindow)
    ).toEqual({ "sensor.by_change": 0, "sensor.by_sum": 0 });
  });

  test("reports zero for statistics the recorder has no data for", async () => {
    const { hass } = hassReturning({ "sensor.empty": [{ change: null, sum: null }] });

    expect(
      await fetchEnergyPeriodGrowth(hass, ["sensor.missing", "sensor.empty"], todayWindow)
    ).toEqual({ "sensor.missing": 0, "sensor.empty": 0 });
  });
});

describe("fetchFossilEnergyConsumption", () => {
  const todayWindow: EnergyPeriodWindow = {
    key: "today",
    start: day(15),
    end: new Date(2024, 4, 15, 23, 59, 59, 999),
  };

  test("asks HA for the fossil share of the grid import over the window", async () => {
    const { hass, callWS } = hassReturning({ "2024-05-15T00:00:00Z": 1.5 });

    expect(
      await fetchFossilEnergyConsumption(hass, ["sensor.grid_in"], "sensor.fossil", todayWindow)
    ).toEqual({ "2024-05-15T00:00:00Z": 1.5 });
    expect(callWS).toHaveBeenCalledWith({
      type: "energy/fossil_energy_consumption",
      start_time: todayWindow.start.toISOString(),
      end_time: todayWindow.end.toISOString(),
      energy_statistic_ids: ["sensor.grid_in"],
      co2_statistic_id: "sensor.fossil",
      period: "hour",
    });
  });

  test("does not ask without a grid import statistic", async () => {
    const { hass, callWS } = hassReturning({});

    expect(await fetchFossilEnergyConsumption(hass, [], "sensor.fossil", todayWindow)).toBe(
      undefined
    );
    expect(callWS).not.toHaveBeenCalled();
  });

  test("ignores a malformed response", async () => {
    const { hass } = hassReturning({ bucket: "lots" });

    expect(
      await fetchFossilEnergyConsumption(hass, ["sensor.grid_in"], "sensor.fossil", todayWindow)
    ).toBe(undefined);
  });
});

describe("getEntityEnergyFromGrowthMap", () => {
  test("adds up every entity of a `|`-separated list", () => {
    const growth = { "sensor.a": 100, "sensor.b": 50 };

    expect(getEntityEnergyFromGrowthMap(growth, "sensor.a | sensor.b | sensor.unknown")).toBe(150);
    expect(getEntityEnergyFromGrowthMap(growth)).toBe(0);
  });
});

describe("subscribeEnergyCollectionData", () => {
  test("is null without an energy collection", () => {
    expect(subscribeEnergyCollectionData(hassWithConnection({}), vi.fn())).toBeNull();
  });

  test("forwards the CO2 signal entity and fossil consumption of each update", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const onData = vi.fn();
    subscribeEnergyCollectionData(hassWithConnection({ _energy: collection }), onData);

    collection.publish({
      co2SignalEntity: "sensor.co2",
      fossilEnergyConsumption: { "2024-05-01": 1.5 },
    });

    expect(onData).toHaveBeenCalledWith({
      co2SignalEntity: "sensor.co2",
      fossilEnergyConsumption: { "2024-05-01": 1.5 },
    });
  });

  test("drops malformed fossil data instead of passing it on", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const onData = vi.fn();
    subscribeEnergyCollectionData(hassWithConnection({ _energy: collection }), onData);

    collection.publish({ co2SignalEntity: 42, fossilEnergyConsumption: { a: "1" } });
    collection.publish(null);

    expect(onData).toHaveBeenNthCalledWith(1, {});
    expect(onData).toHaveBeenNthCalledWith(2, {});
  });

  test("stops forwarding after unsubscribing", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const onData = vi.fn();
    const unsubscribe = subscribeEnergyCollectionData(
      hassWithConnection({ _energy_custom: collection }),
      onData,
      "energy_custom"
    );

    unsubscribe?.();
    collection.publish({ co2SignalEntity: "sensor.co2" });

    expect(onData).not.toHaveBeenCalled();
  });
});

describe("computeNonFossilFromCollection", () => {
  test("subtracts fossil kWh from grid Wh", () => {
    expect(computeNonFossilFromCollection({ a: 0.25, b: 0.5 }, 1000)).toEqual({
      nonFossilEnergy: 250,
      nonFossilPercentage: 25,
    });
  });

  test("clamps to zero when fossil exceeds grid", () => {
    expect(computeNonFossilFromCollection({ coal: 2 }, 1000)).toEqual({
      nonFossilEnergy: 0,
      nonFossilPercentage: 0,
    });
  });

  test("reports 0% without grid consumption", () => {
    expect(computeNonFossilFromCollection({}, 0).nonFossilPercentage).toBe(0);
  });
});

describe("findEnergyCollection", () => {
  test("finds the collection of the current dashboard", () => {
    const collection = fakeEnergyCollection(day(1), day(2));
    const hass = hassWithConnection(
      { _energy_my_dashboard: collection },
      { panelUrl: "my_dashboard" }
    );

    expect(findEnergyCollection(hass)).toBe(collection);
  });

  test("skips the bare websocket collection HA stores before the energy collection", () => {
    const { setPeriod: _setPeriod, ...bareCollection } = fakeEnergyCollection(day(1), day(2));
    const fallback = fakeEnergyCollection(day(3), day(4));
    const hass = hassWithConnection({ _energy_custom: bareCollection, _energy: fallback });

    expect(findEnergyCollection(hass, "energy_custom")).toBe(fallback);
  });

  test("is null, and creates nothing, before HA's energy cards created a collection", () => {
    const hass = hassWithConnection({});

    expect(findEnergyCollection(hass)).toBeNull();
    expect(Object.keys(hass.connection)).toEqual([]);
  });
});

describe("energyDefaultPeriodStorageKey", () => {
  test("matches the key HA reads the remembered preset from", () => {
    const hass = fakeHass({ panelUrl: "dashboard-energy" });

    expect(energyDefaultPeriodStorageKey(hass)).toBe(
      "energy-default-period-_energy_dashboard-energy"
    );
    expect(energyDefaultPeriodStorageKey(hass, "energy_custom")).toBe(
      "energy-default-period-_energy_custom"
    );
  });
});
