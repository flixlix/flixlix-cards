import { describe, expect, test } from "vite-plus/test";
import { fakeConfig } from "../testing/fixtures";
import {
  assertRenderableFlowCardConfig,
  clickableEntitiesWithDefault,
  displayZeroLinesWithDefaults,
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

  test("display zero lines fall back per field to the defaults", () => {
    expect(displayZeroLinesWithDefaults(undefined)).toEqual(defaultValues.displayZeroLines);
    expect(displayZeroLinesWithDefaults({ mode: "hide", transparency: 40 })).toEqual({
      ...defaultValues.displayZeroLines,
      mode: "hide",
      transparency: 40,
    });
    expect(
      displayZeroLinesWithDefaults({ mode: "grey_out", grey_out_circles: true }).grey_out_circles
    ).toBe(true);
  });

  test("entities are clickable unless clickable_entities is false", () => {
    expect(clickableEntitiesWithDefault(undefined)).toBe(true);
    expect(clickableEntitiesWithDefault(true)).toBe(true);
    expect(clickableEntitiesWithDefault(false)).toBe(false);
  });
});
