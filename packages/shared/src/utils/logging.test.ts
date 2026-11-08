import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { setupLogger } from "./logging";

const card = (version: string) => ({
  name: "Power Flow Card Plus",
  version,
  readme: "https://example.com",
});

const banner = (version: string) => {
  const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => undefined);
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "groupEnd").mockImplementation(() => undefined);
  setupLogger(card(version));
  const [format = "", ...styles] = group.mock.calls[0] as string[];
  return { format, styles, lines: log.mock.calls.map((call) => String(call[0])) };
};

describe("setupLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints one style per %c segment, with name, version and build", () => {
    const { format, styles } = banner("1.2.3");

    expect(format.split("%c").length - 1).toBe(styles.length);
    expect(format).toContain("Power Flow Card Plus");
    expect(format).toContain("v1.2.3");
    expect(format).toContain("dev build");
  });

  it("marks a pre-release and points to where to report problems", () => {
    const { format, styles, lines } = banner("0.4.0-beta.0");

    expect(format).toContain(" BETA ");
    expect(format.split("%c").length - 1).toBe(styles.length);
    expect(lines.some((line) => line.includes("pre-release"))).toBe(true);
  });

  it("shows no pre-release segment for a stable version", () => {
    const { format, lines } = banner("1.2.3");

    expect(format).not.toContain("BETA");
    expect(lines.some((line) => line.includes("pre-release"))).toBe(false);
  });

  it("rounds only the outer ends of the badge", () => {
    const { styles } = banner("0.4.0-beta.0");

    expect(styles[0]).toContain("999px 0 0 999px");
    expect(styles.at(-1)).toContain("0 999px 999px 0");
    expect(styles.slice(1, -1).every((style) => !style.includes("border-radius"))).toBe(true);
  });
});
