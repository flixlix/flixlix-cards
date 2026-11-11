// @vitest-environment jsdom
import { type ReactiveController } from "lit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { FlowLayoutController } from "./measure";

type Box = { left: number; top: number; width: number; height: number };

/** jsdom lays nothing out, so each element reports the box the card would give it. */
const placed = (element: HTMLElement, box: Box) => {
  element.getBoundingClientRect = () => ({
    ...box,
    x: box.left,
    y: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height,
    toJSON: () => box,
  });
  return element;
};

const div = (className: string, box: Box, ...children: HTMLElement[]) => {
  const element = document.createElement("div");
  element.className = className;
  element.append(...children);
  return placed(element, box);
};

const circle = (container: string, box: Box) =>
  div(`circle-container ${container}`, box, div("circle", box));

/** Solar above, then grid, hub and home in the middle row, at the card's natural height. */
const boxes = () => ({
  content: { left: 0, top: 0, width: 470, height: 340 },
  middle: { left: 0, top: 130, width: 470, height: 100 },
  hub: { left: 195, top: 130, width: 80, height: 0 },
  grid: { left: 0, top: 130, width: 80, height: 80 },
  solar: { left: 195, top: 0, width: 80, height: 80 },
  home: { left: 390, top: 130, width: 80, height: 80 },
});

const observers: { resize: () => void; watching: boolean }[] = [];

class FakeResizeObserver {
  private readonly record: { resize: () => void; watching: boolean };
  constructor(resize: () => void) {
    this.record = { resize, watching: false };
    observers.push(this.record);
  }
  observe() {
    this.record.watching = true;
  }
  disconnect() {
    this.record.watching = false;
  }
}

const mountController = () => {
  const layout = boxes();
  const content = div(
    "card-content",
    layout.content,
    circle("solar", layout.solar),
    div(
      "row middle",
      layout.middle,
      circle("grid", layout.grid),
      div("spacer hub", layout.hub),
      circle("home", layout.home)
    )
  );
  content.id = "power-flow-card-plus";
  const controllers: ReactiveController[] = [];
  const host = Object.assign(document.createElement("div"), {
    addController: (controller: ReactiveController) => {
      controllers.push(controller);
    },
    removeController: () => {},
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
  host.attachShadow({ mode: "open" }).append(content);
  const controller = new FlowLayoutController(host, "power-flow-card-plus");
  return { controller, host, layout };
};

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  observers.length = 0;
});

describe("FlowLayoutController", () => {
  test("measures the circles after a render", () => {
    const { controller, host } = mountController();

    controller.hostUpdated();

    expect(controller.layout?.home).toEqual({ cx: 430, cy: 170, r: 40 });
    expect(controller.layout?.solar).toEqual({ cx: 235, cy: 40, r: 40 });
    expect(host.requestUpdate).toHaveBeenCalledTimes(1);
  });

  test("measures again when the content resizes without a render, so the lines follow", () => {
    const { controller, host, layout } = mountController();
    controller.hostUpdated();

    layout.content.height = 600;
    layout.middle.top = 260;
    layout.grid.top = 260;
    layout.home.top = 260;
    observers[0]?.resize();

    expect(controller.layout?.home.cy).toBe(300);
    expect(controller.layout?.height).toBe(600);
    expect(host.requestUpdate).toHaveBeenCalledTimes(2);
  });

  test("a resize that moves nothing does not render again", () => {
    const { controller, host } = mountController();
    controller.hostUpdated();

    observers[0]?.resize();

    expect(host.requestUpdate).toHaveBeenCalledTimes(1);
  });

  test("stops watching when the card is taken out and watches again when it is put back", () => {
    const { controller } = mountController();
    controller.hostUpdated();

    controller.hostDisconnected();
    expect(observers[0]?.watching).toBe(false);

    controller.hostConnected();
    expect(observers[0]?.watching).toBe(true);
  });
});
