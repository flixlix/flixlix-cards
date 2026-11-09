import { describe, expect, test } from "vite-plus/test";

import { fakeHass, withDarkMode } from "./fake-hass";

const darkModeOf = (hass: ReturnType<typeof fakeHass>) =>
  "darkMode" in hass.themes ? hass.themes.darkMode : undefined;

describe("fake hass theme", () => {
  test("is light unless asked for dark, as Home Assistant reports it in hass.themes", () => {
    expect(darkModeOf(fakeHass())).toBe(false);
    expect(darkModeOf(fakeHass({ darkMode: true }))).toBe(true);
  });

  test("switches to dark and back while keeping its states", () => {
    const light = fakeHass({ states: { "sensor.grid_power": "640" } });
    const dark = withDarkMode(light, true);

    expect(darkModeOf(dark)).toBe(true);
    expect(dark.states["sensor.grid_power"]?.state).toBe("640");
    expect(darkModeOf(withDarkMode(dark, false))).toBe(false);
  });
});
