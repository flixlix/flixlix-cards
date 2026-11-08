import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { fireEvent } from "./fire-event";

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

describe("fire-event", () => {
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
});
