import { describe, expect, test } from "vite-plus/test";
import { fakeConfig } from "../testing/fixtures";
import { assertRenderableFlowCardConfig, displayZeroLinesWithDefaults } from "./flow-card-config";
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
