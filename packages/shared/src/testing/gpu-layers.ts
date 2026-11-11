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

/**
 * Why Chromium put each of the page's GPU layers on its own layer, as its compositing reason ids
 * (e.g. `ActiveTransformAnimation`, `Overlap`), sorted so two reads compare equal.
 */
export const gpuLayerReasons = async (): Promise<string[]> => {
  const session = cdp() as unknown as Session;
  const tree = nextLayerTree(session);
  await session.send("LayerTree.enable");
  // LayerTree only reports on the next frame it commits, so paint something for one.
  const nudge = document.createElement("div");
  nudge.style.cssText = `position:fixed;width:1px;height:1px;background:rgb(${Math.random() * 255},0,0)`;
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
