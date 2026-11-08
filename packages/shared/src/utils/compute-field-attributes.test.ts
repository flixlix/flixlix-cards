import { describe, expect, test } from "vite-plus/test";
import { fakeEntity, fakeHass } from "../testing/fixtures";
import { computeFieldIcon, computeFieldName } from "./compute-field-attributes";

describe("compute-field-attributes", () => {
  test("computeFieldName and computeFieldIcon prioritize explicit values", () => {
    const hass = fakeHass();
    const field = {
      name: "Configured Name",
      icon: "mdi:configured",
      entity: "sensor.grid_power",
      use_metadata: true,
    };

    expect(computeFieldName(hass, field, "Fallback Name")).toBe("Configured Name");
    expect(computeFieldIcon(hass, field, "mdi:fallback")).toBe("mdi:configured");
  });

  test("computeFieldName and computeFieldIcon resolve metadata for single and split entities", () => {
    const hass = fakeHass({
      states: {
        "sensor.grid_import": fakeEntity("sensor.grid_import", "100", {
          friendly_name: "Grid Import",
          icon: "mdi:transmission-tower",
        }),
        "sensor.grid_export": fakeEntity("sensor.grid_export", "20", {
          friendly_name: "Grid Export",
          icon: "mdi:transmission-tower-export",
        }),
      },
    });

    const single = {
      entity: "sensor.grid_import",
      use_metadata: true,
    };
    const split = {
      entity: { consumption: "sensor.grid_import", production: "sensor.grid_export" },
      use_metadata: true,
    };

    expect(computeFieldName(hass, single, "Fallback Name")).toBe("Grid Import");
    expect(computeFieldIcon(hass, single, "mdi:fallback")).toBe("mdi:transmission-tower");
    expect(computeFieldName(hass, split, "Fallback Name")).toBe("Grid Import");
    expect(computeFieldIcon(hass, split, "mdi:fallback")).toBe("mdi:transmission-tower");
  });
});
