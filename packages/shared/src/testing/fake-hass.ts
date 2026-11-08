import { type HomeAssistant } from "custom-card-helpers";
import { vi } from "vite-plus/test";
import { type FakeHassOptions, fakeHass as previewHass } from "../preview/fake-hass";

export * from "../preview/fake-hass";

/** The docs' fake `hass`, with `callWS` and `callService` as spies to assert on. */
export const fakeHass = (options?: FakeHassOptions): HomeAssistant => {
  const hass = previewHass(options);
  vi.spyOn(hass, "callWS");
  vi.spyOn(hass, "callService");
  return hass;
};
