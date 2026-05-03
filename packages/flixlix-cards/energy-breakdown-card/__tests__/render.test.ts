import { describe, expect, test } from "vitest";
import { EnergyBreakdownCard } from "../src/energy-breakdown-card";
import { describeDonutSegment, resolveSegments } from "../src/utils";

describe("energy-breakdown-card", () => {
  const hass = {
    localize: (key: string) => key,
    locale: { language: "en", number_format: "comma_decimal" },
    states: {
      "sensor.solar": {
        state: "120",
        attributes: { friendly_name: "Solar", unit_of_measurement: "kWh" },
      },
      "sensor.grid": {
        state: "80",
        attributes: { friendly_name: "Grid", unit_of_measurement: "kWh" },
      },
      "sensor.battery": {
        state: "40",
        attributes: { friendly_name: "Battery", unit_of_measurement: "kWh" },
      },
    },
    config: {},
  } as any;

  test("renders with valid config", () => {
    const card = new EnergyBreakdownCard();
    card.hass = hass;
    card.setConfig({
      type: "custom:energy-breakdown-card",
      entities: [{ entity: "sensor.solar" }, { entity: "sensor.grid" }],
    });
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });

  test("renders empty state when no value", () => {
    const card = new EnergyBreakdownCard();
    card.hass = { ...hass, states: {} };
    card.setConfig({
      type: "custom:energy-breakdown-card",
      entities: [{ entity: "sensor.unknown" }],
    });
    const rendered = (card as unknown as { render: () => unknown }).render();
    expect(rendered).toBeTruthy();
  });

  test("setConfig throws if entities not provided as list", () => {
    const card = new EnergyBreakdownCard();
    expect(() =>
      card.setConfig({
        type: "custom:energy-breakdown-card",
      } as any)
    ).toThrow();
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

  test("setConfig stores collection_key when provided", () => {
    const card = new EnergyBreakdownCard();
    card.setConfig({
      type: "custom:energy-breakdown-card",
      entities: [{ entity: "sensor.solar" }],
      collection_key: "energy_kitchen",
      energy_date_selection: true,
    });
    expect((card as any)._energyCollectionKey).toBe("energy_kitchen");
  });
});
