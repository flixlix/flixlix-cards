import { beforeEach, describe, expect, test, vi } from "vitest";

import { fireEvent } from "../src/ui-editor/utils/fire-event";
import { loadHaForm } from "../src/ui-editor/utils/load-ha-form";
import { loadSortable } from "../src/ui-editor/utils/sortable.ondemand";

vi.mock("../src/ui-editor/utils/sortable", () => ({
  default: {
    mount: vi.fn(),
  },
}));

describe("ui editor utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("fireEvent dispatches default bubbling and composed event with detail", () => {
    const dispatchEvent = vi.fn();
    const node = {
      dispatchEvent,
    } as unknown as HTMLElement;

    const detail = { foo: "bar" } as any;
    const event = fireEvent(node, "hass-more-info" as any, detail);

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect((event as any).detail).toEqual(detail);
  });

  test("fireEvent uses empty detail and explicit options", () => {
    const dispatchEvent = vi.fn();
    const node = {
      dispatchEvent,
    } as unknown as HTMLElement;

    const event = fireEvent(node, "hass-more-info" as any, undefined, {
      bubbles: false,
      cancelable: true,
      composed: false,
    });

    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(true);
    expect(event.composed).toBe(false);
    expect((event as any).detail).toEqual({});
  });

  test("loadHaForm initializes button-card and entities-card config elements when needed", async () => {
    const buttonGetConfigElement = vi.fn();
    const entitiesGetConfigElement = vi.fn();
    const loadCardHelpers = vi.fn().mockResolvedValue({});

    vi.stubGlobal("window", {
      loadCardHelpers,
    });
    vi.stubGlobal("customElements", {
      get: vi.fn((name: string) => {
        if (name === "ha-form") return undefined;
        if (name === "ha-entity-picker") return undefined;
        if (name === "hui-button-card") return { getConfigElement: buttonGetConfigElement };
        if (name === "hui-entities-card") return { getConfigElement: entitiesGetConfigElement };
        return undefined;
      }),
    });

    await loadHaForm();

    expect(buttonGetConfigElement).toHaveBeenCalledTimes(1);
    expect(entitiesGetConfigElement).toHaveBeenCalledTimes(1);
    expect(loadCardHelpers).toHaveBeenCalledTimes(1);
  });

  test("loadHaForm returns immediately when ha-form is already registered", async () => {
    const loadCardHelpers = vi.fn();

    vi.stubGlobal("window", {
      loadCardHelpers,
    });
    vi.stubGlobal("customElements", {
      get: vi.fn((name: string) => {
        if (name === "ha-form") return class HaForm {};
        return undefined;
      }),
    });

    await loadHaForm();

    expect(loadCardHelpers).not.toHaveBeenCalled();
  });

  test("loadSortable caches loaded module instance", async () => {
    const first = await loadSortable();
    const second = await loadSortable();

    expect(second).toBe(first);
  });
});
