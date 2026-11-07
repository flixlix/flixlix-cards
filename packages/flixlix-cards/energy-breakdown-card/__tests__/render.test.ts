import { type Connection, type MessageBase } from "home-assistant-js-websocket";
import { type HomeAssistant } from "custom-card-helpers";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { EnergyBreakdownCard } from "../src/energy-breakdown-card";
import { type EnergyBreakdownCardConfig } from "../src/types";
import { describeDonutSegment, resolveSegments } from "../src/utils";

type EntityState = HomeAssistant["states"][string];

function entityState(entity_id: string, state: string, friendly_name: string): EntityState {
  return {
    entity_id,
    state,
    attributes: { friendly_name, unit_of_measurement: "kWh" },
    last_changed: "",
    last_updated: "",
    context: { id: "", user_id: null, parent_id: null },
  };
}

function makeHass(overrides: Partial<HomeAssistant> = {}): HomeAssistant {
  const hass: Partial<HomeAssistant> = {
    localize: (key: string) => key,
    states: {
      "sensor.solar": entityState("sensor.solar", "120", "Solar"),
      "sensor.grid": entityState("sensor.grid", "80", "Grid"),
      "sensor.battery": entityState("sensor.battery", "40", "Battery"),
    },
    ...overrides,
  };
  return hass as HomeAssistant;
}

async function mount(
  config: EnergyBreakdownCardConfig,
  hass: HomeAssistant = makeHass()
): Promise<EnergyBreakdownCard> {
  const card = new EnergyBreakdownCard();
  card.setConfig(config);
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

describe("energy-breakdown-card", () => {
  const hass = makeHass();

  afterEach(() => {
    document.body.replaceChildren();
  });

  test("renders a segment per entity with a value", async () => {
    const card = await mount({
      type: "custom:energy-breakdown-card",
      entities: [{ entity: "sensor.solar" }, { entity: "sensor.grid" }],
    });
    const legend = card.shadowRoot?.querySelectorAll(".legend-item");
    expect(legend).toHaveLength(2);
    expect(card.shadowRoot?.querySelector(".empty")).toBeNull();
  });

  test("renders empty state when no value", async () => {
    const card = await mount(
      { type: "custom:energy-breakdown-card", entities: [{ entity: "sensor.unknown" }] },
      makeHass({ states: {} })
    );
    expect(card.shadowRoot?.querySelector(".empty")).not.toBeNull();
  });

  test("setConfig throws if entities not provided as list", () => {
    const card = new EnergyBreakdownCard();
    const config: Partial<EnergyBreakdownCardConfig> = { type: "custom:energy-breakdown-card" };
    expect(() => card.setConfig(config as EnergyBreakdownCardConfig)).toThrow(
      "`entities` must be a list"
    );
  });

  test("resolveSegments computes percentages and total", () => {
    const { segments, total } = resolveSegments(hass, {
      type: "custom:energy-breakdown-card",
      entities: [
        { entity: "sensor.solar" },
        { entity: "sensor.grid" },
        { entity: "sensor.battery" },
      ],
    });
    expect(total).toBe(240);
    expect(segments).toHaveLength(3);
    expect(segments[0]?.name).toBe("Solar");
    expect(segments[0]?.percent).toBeCloseTo(50, 5);
    expect(segments[1]?.percent).toBeCloseTo(33.333, 2);
    expect(segments.reduce((acc, s) => acc + s.percent, 0)).toBeCloseTo(100, 5);
  });

  test("resolveSegments groups overflow into 'Other' when max_items is set", () => {
    const { segments } = resolveSegments(hass, {
      type: "custom:energy-breakdown-card",
      entities: [
        { entity: "sensor.solar" },
        { entity: "sensor.grid" },
        { entity: "sensor.battery" },
      ],
      max_items: 2,
      group_others: true,
    });
    expect(segments).toHaveLength(3);
    expect(segments[2]?.name).toBe("Other");
    expect(segments[2]?.value).toBe(40);
  });

  test("resolveSegments slices when group_others is false", () => {
    const { segments } = resolveSegments(hass, {
      type: "custom:energy-breakdown-card",
      entities: [
        { entity: "sensor.solar" },
        { entity: "sensor.grid" },
        { entity: "sensor.battery" },
      ],
      max_items: 2,
      group_others: false,
    });
    expect(segments).toHaveLength(2);
    expect(segments.find((s) => s.name === "Other")).toBeUndefined();
  });

  test("getCardSize returns sensible default", () => {
    const card = new EnergyBreakdownCard();
    card.setConfig({
      type: "custom:energy-breakdown-card",
      entities: [{ entity: "sensor.solar" }],
    });
    expect(card.getCardSize()).toBeGreaterThan(0);
  });

  test("resolveSegments uses injected resolver", () => {
    const { segments, total } = resolveSegments(
      hass,
      {
        type: "custom:energy-breakdown-card",
        entities: [{ entity: "sensor.solar" }, { entity: "sensor.grid" }],
      },
      (entity) => (entity === "sensor.solar" ? 200 : 50)
    );
    expect(total).toBe(250);
    expect(segments[0]?.value).toBe(200);
    expect(segments[1]?.value).toBe(50);
  });

  test("describeDonutSegment small cornerRadius produces the two-arc cap pattern", () => {
    // outer/inner radii give thickness 22 (rO-rI). With cr=2 (well below thickness/2=11),
    // the path must use 4 cornerArc + 2 line commands, NOT a single chord-spanning arc.
    const path = describeDonutSegment({
      cx: 110,
      cy: 110,
      innerRadius: 88,
      outerRadius: 110,
      startAngle: 0,
      endAngle: 90,
      cornerRadius: 2,
    });
    // M, A(outer), A(corner), L, A(corner), A(inner), A(corner), L, A(corner), Z
    const arcCount = (path.match(/A /g) ?? []).length;
    const lineCount = (path.match(/L /g) ?? []).length;
    expect(arcCount).toBe(6);
    expect(lineCount).toBe(2);
  });

  test("describeDonutSegment with cornerRadius=0 falls back to plain wedge", () => {
    const path = describeDonutSegment({
      cx: 110,
      cy: 110,
      innerRadius: 88,
      outerRadius: 110,
      startAngle: 0,
      endAngle: 90,
      cornerRadius: 0,
    });
    const arcCount = (path.match(/A /g) ?? []).length;
    const lineCount = (path.match(/L /g) ?? []).length;
    expect(arcCount).toBe(2);
    expect(lineCount).toBe(1);
  });

  test("describeDonutSegment goes clockwise (sweep flag 1 on outer arc)", () => {
    const path = describeDonutSegment({
      cx: 110,
      cy: 110,
      innerRadius: 88,
      outerRadius: 110,
      startAngle: 0,
      endAngle: 120,
      cornerRadius: 0,
    });
    // The outer arc command should use sweep flag 1 (clockwise in screen-coord SVG)
    const outerArcMatch = path.match(/A 110 110 0 \d+ (\d)/);
    expect(outerArcMatch?.[1]).toBe("1");
  });

  test("reads the energy period from the configured collection_key", async () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 2);
    const requests: MessageBase[] = [];
    const callWS: HomeAssistant["callWS"] = (msg) => {
      requests.push(msg);
      return Promise.reject(new Error("statistics are not served in this test"));
    };
    const connection = Object.assign({} as Connection, { _energy_kitchen: { start, end } });
    await mount(
      {
        type: "custom:energy-breakdown-card",
        entities: [{ entity: "sensor.solar" }],
        collection_key: "energy_kitchen",
        energy_date_selection: true,
      },
      makeHass({ callWS, connection })
    );
    await vi.waitFor(() =>
      expect(requests).toContainEqual(expect.objectContaining({ start_time: start.toISOString() }))
    );
  });
});
