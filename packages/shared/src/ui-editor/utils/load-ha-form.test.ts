import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { loadHaForm } from "./load-ha-form";

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

describe("load-ha-form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
});
