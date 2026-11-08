import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { loadSortable } from "./sortable.ondemand";

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

describe("sortable.ondemand", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("loadSortable caches loaded module instance", async () => {
    const first = await loadSortable();
    const second = await loadSortable();

    expect(second).toBe(first);
  });
});
