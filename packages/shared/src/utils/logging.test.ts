import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { setupLogger } from "./logging";

const card = { name: "Power Flow Card Plus", version: "1.2.3", readme: "https://example.com" };

describe("setupLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints one style per %c segment, with name, version and build", () => {
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "groupEnd").mockImplementation(() => undefined);

    setupLogger(card);

    const [format = "", ...styles] = group.mock.calls[0] as string[];
    expect(format.split("%c").length - 1).toBe(styles.length);
    expect(format).toContain("Power Flow Card Plus");
    expect(format).toContain("v1.2.3");
    expect(format).toContain("dev build");
  });
});
