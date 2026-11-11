import { type DotAnimationOption } from "@flixlix-cards/shared/types";

export type DotAnimation = Exclude<DotAnimationOption, "auto">;

/**
 * GPUs whose drivers draw the layers Chromium builds around GPU-moved dots in the wrong place,
 * shifting circle contents and cutting lines: the ARM Mali in the Fire HD 10 (2023) (#484).
 */
const CLASSIC_RENDERERS = /\bmali\b/i;

/** The dot animation for a WebGL renderer name; unknown or hidden names keep the GPU dots. */
export const dotAnimationForRenderer = (renderer: string | undefined): DotAnimation =>
  renderer !== undefined && CLASSIC_RENDERERS.test(renderer) ? "classic" : "gpu";

const readRenderer = (): string | undefined => {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) {
      return undefined;
    }
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer: unknown = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return typeof renderer === "string" ? renderer : undefined;
  } catch {
    return undefined;
  }
};

/** Read once per page: a WebGL context is not free on the slow devices this is for. */
let detected: DotAnimation | undefined;

/** The dot animation a card uses: its `dot_animation`, with `auto` decided by the GPU. */
export const resolveDotAnimation = (option: DotAnimationOption): DotAnimation => {
  if (option !== "auto") {
    return option;
  }
  detected ??= dotAnimationForRenderer(readRenderer());
  return detected;
};
