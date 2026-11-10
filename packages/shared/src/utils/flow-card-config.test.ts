import { describe, expect, test } from "vite-plus/test";
import { fakeConfig } from "../testing/fixtures";
import {
  assertRenderableFlowCardConfig,
  displayZeroLinesWithDefaults,
  dropEmptyEntity,
  isDeviceOnly,
  withoutEmptyEntities,
} from "./flow-card-config";
import { defaultValues } from "./get-default-config";

describe("flow card config", () => {
  test("rejects legacy individual1/individual2 keys", () => {
    const config = fakeConfig({ entities: { solar: { entity: "sensor.solar" }, individual1: [] } });
    expect(() => assertRenderableFlowCardConfig(config)).toThrow(/outdated configuration/);
  });

  test("needs a grid, solar or battery entity", () => {
    expect(() => assertRenderableFlowCardConfig(fakeConfig({ entities: {} }))).toThrow(
      /At least one entity/
    );
    expect(() =>
      assertRenderableFlowCardConfig(
        fakeConfig({ entities: { solar: { entity: "sensor.solar" } } })
      )
    ).not.toThrow();
  });

  test("device-only configs need the allowDeviceOnly option", () => {
    const withDevice = fakeConfig({ entities: { individual: [{ entity: "sensor.plug" }] } });
    expect(() => assertRenderableFlowCardConfig(withDevice)).toThrow(/At least one entity/);
    expect(() =>
      assertRenderableFlowCardConfig(withDevice, { allowDeviceOnly: true })
    ).not.toThrow();
    const withHome = fakeConfig({ entities: { home: { entity: "sensor.home" } } });
    expect(() => assertRenderableFlowCardConfig(withHome, { allowDeviceOnly: true })).not.toThrow();
  });

  test("device-only mode still needs a home entity or a device", () => {
    expect(() =>
      assertRenderableFlowCardConfig(fakeConfig({ entities: {} }), { allowDeviceOnly: true })
    ).toThrow(/individual device/);
    expect(() =>
      assertRenderableFlowCardConfig(fakeConfig({ entities: { individual: [{ entity: "" }] } }), {
        allowDeviceOnly: true,
      })
    ).toThrow(/individual device/);
  });

  test("a battery given only as a split entity counts as a source", () => {
    const entities = {
      battery: { entity: { consumption: "sensor.b_in", production: "sensor.b_out" } },
    };
    expect(() => assertRenderableFlowCardConfig(fakeConfig({ entities }))).not.toThrow();
  });

  test("display zero lines fall back per field to the defaults", () => {
    expect(displayZeroLinesWithDefaults(undefined)).toEqual(defaultValues.displayZeroLines);
    expect(displayZeroLinesWithDefaults({ mode: "hide", transparency: 40 })).toEqual({
      ...defaultValues.displayZeroLines,
      mode: "hide",
      transparency: 40,
    });
  });
});

describe("empty entities", () => {
  test("an empty string, or a pair with neither side filled in, is dropped", () => {
    expect(dropEmptyEntity({ entity: "", icon: "mdi:a" })).toEqual({ icon: "mdi:a" });
    expect(dropEmptyEntity({ entity: "  " })).toEqual({});
    expect(dropEmptyEntity({ entity: {} })).toEqual({});
    expect(dropEmptyEntity({ entity: { consumption: "", production: undefined } })).toEqual({});
  });

  test("a filled entity is kept as it is", () => {
    const node = { entity: "sensor.a", icon: "mdi:a" };
    expect(dropEmptyEntity(node)).toBe(node);
  });

  test("a pair keeps only the side that is filled in", () => {
    expect(dropEmptyEntity({ entity: { consumption: "sensor.in", production: "" } })).toEqual({
      entity: { consumption: "sensor.in" },
    });
  });

  test("a node with no entity key is left alone", () => {
    const node = { icon: "mdi:a" };
    expect(dropEmptyEntity(node)).toBe(node);
  });

  test("clears every node's empty entity and leaves the rest of the config", () => {
    const config = fakeConfig({
      entities: {
        grid: { entity: {} },
        solar: { entity: "" },
        battery: { entity: { consumption: "", production: "" } },
        fossil_fuel_percentage: { entity: "", name: "Clean" },
        home: { entity: "sensor.home" },
        individual: [{ entity: "sensor.plug" }],
      } as never,
      title: "Home",
    });

    const cleaned = withoutEmptyEntities(config);

    expect(cleaned.entities).toEqual({
      grid: {},
      solar: {},
      battery: {},
      fossil_fuel_percentage: { name: "Clean" },
      home: { entity: "sensor.home" },
      individual: [{ entity: "sensor.plug" }],
    });
    expect(cleaned.title).toBe("Home");
  });

  test("a config left with only empty source entities is a device-only config", () => {
    const config = withoutEmptyEntities(
      fakeConfig({
        entities: {
          grid: { entity: {} },
          solar: { entity: "" },
          individual: [{ entity: "sensor.plug" }],
        } as never,
      })
    );
    expect(isDeviceOnly(config.entities)).toBe(true);
    expect(() => assertRenderableFlowCardConfig(config, { allowDeviceOnly: true })).not.toThrow();
  });

  test("a config without entities is returned as it is", () => {
    const config = { type: "custom:power-flow-card-plus" } as never;
    expect(withoutEmptyEntities(config)).toBe(config);
  });
});
