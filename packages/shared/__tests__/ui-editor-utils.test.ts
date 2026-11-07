import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { fireEvent } from "../src/ha/common/dom/fire-event";
import { loadHaForm } from "../src/ui-editor/utils/load-ha-form";
import { loadSortable } from "../src/ui-editor/utils/sortable.ondemand";

vi.mock("sortablejs", () => ({
  default: {
    mount: vi.fn(),
  },
}));

declare global {
  interface HASSDomEvents {
    "test-event": { foo: string };
  }
}

describe("ui editor utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("fireEvent dispatches default bubbling and composed event with detail", () => {
    const node = new EventTarget();
    const dispatchEvent = vi.spyOn(node, "dispatchEvent");

    const detail = { foo: "bar" };
    const event = fireEvent(node, "test-event", detail);

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.detail).toEqual(detail);
  });

  test("fireEvent uses empty detail and explicit options", () => {
    const node = new EventTarget();

    const event = fireEvent(node, "test-event", undefined, {
      bubbles: false,
      cancelable: true,
      composed: false,
    });

    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(true);
    expect(event.composed).toBe(false);
    expect(event.detail).toEqual({});
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
        if (name === "ha-form") {
          return undefined;
        }
        if (name === "ha-entity-picker") {
          return undefined;
        }
        if (name === "hui-button-card") {
          return { getConfigElement: buttonGetConfigElement };
        }
        if (name === "hui-entities-card") {
          return { getConfigElement: entitiesGetConfigElement };
        }
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
        if (name === "ha-form") {
          return {};
        }
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
