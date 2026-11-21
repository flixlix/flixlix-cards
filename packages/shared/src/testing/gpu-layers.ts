import { cdp } from "vite-plus/test/browser/context";
import { sortedCopy } from "../utils/utils";

type Layer = { layerId: string };
type LayerTreeEvent = { layers?: Layer[] };

/** The part of the Chrome DevTools Protocol session Vitest's Playwright provider hands out. */
type Session = {
  send(method: string, params?: object): Promise<unknown>;
  on(event: string, listener: (event: LayerTreeEvent) => void): void;
  off(event: string, listener: (event: LayerTreeEvent) => void): void;
};

const nextLayerTree = (session: Session) =>
  new Promise<Layer[]>((resolve, reject) => {
    const listener = ({ layers }: LayerTreeEvent) => {
      if (layers) {
        clearTimeout(timeout);
        session.off("LayerTree.layerTreeDidChange", listener);
        resolve(layers);
      }
    };
    const timeout = setTimeout(() => {
      session.off("LayerTree.layerTreeDidChange", listener);
      reject(new Error("no layer tree from Chromium"));
    }, 5000);
    session.on("LayerTree.layerTreeDidChange", listener);
  });

const readLayerReasons = async (): Promise<string[]> => {
  const session = cdp() as unknown as Session;
  const tree = nextLayerTree(session);
  await session.send("LayerTree.enable");
  // LayerTree only reports on the next frame it commits, so paint something for one.
  const nudge = document.createElement("div");
  // Pinned so it overlaps the same composited layers on every read; left at its static position
  // it moves with the page's layout and only sometimes earns an `Overlap` layer of its own.
  nudge.style.cssText = `position:fixed;top:0;left:0;width:1px;height:1px;background:rgb(${Math.random() * 255},0,0)`;
  document.body.append(nudge);
  try {
    const layers = await tree;
    const reasons = await Promise.all(
      layers.map(async ({ layerId }) => {
        const { compositingReasonIds = [] } = (await session
          .send("LayerTree.compositingReasons", { layerId })
          .catch(() => ({}))) as { compositingReasonIds?: string[] };
        return sortedCopy(compositingReasonIds, (a, b) => a.localeCompare(b)).join("+");
      })
    );
    return sortedCopy(reasons, (a, b) => a.localeCompare(b));
  } finally {
    nudge.remove();
    await session.send("LayerTree.disable");
  }
};

/**
 * Why Chromium put each of the page's GPU layers on its own layer, as its compositing reason ids
 * (e.g. `ActiveTransformAnimation`, `Overlap`), sorted so two reads compare equal. Reads until
 * two in a row agree, so a layer that only exists while the page is still settling is skipped.
 */
export const gpuLayerReasons = async (attempts = 5, previous?: string[]): Promise<string[]> => {
  const current = await readLayerReasons();
  if (attempts <= 1 || current.join() === previous?.join()) {
    return current;
  }
  return gpuLayerReasons(attempts - 1, current);
};

/** The page's GPU layers with the card's flow dots hidden and shown. */
export const gpuLayersWithAndWithoutDots = async (root: ShadowRoot) => {
  const dots = [...root.querySelectorAll<SVGSVGElement>("svg.flow-dot")];
  for (const dot of dots) {
    dot.style.display = "none";
  }
  const without = await gpuLayerReasons();
  for (const dot of dots) {
    dot.style.display = "";
  }
  return { without, with: await gpuLayerReasons() };
};
