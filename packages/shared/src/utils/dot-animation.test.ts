import { describe, expect, test } from "vite-plus/test";
import { dotAnimationForRenderer, resolveDotAnimation } from "./dot-animation";

describe("dotAnimationForRenderer", () => {
  test.for([
    ["ANGLE (ARM, Mali-G52 MC2, OpenGL ES 3.2)", "classic"],
    ["Mali-G52 MC2", "classic"],
    ["ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)", "gpu"],
    ["Adreno (TM) 610", "gpu"],
    ["ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)", "gpu"],
    ["WebKit WebGL", "gpu"],
  ] as const)("%s gets %s dots", ([renderer, animation]) => {
    expect(dotAnimationForRenderer(renderer)).toBe(animation);
  });

  test("an unknown renderer keeps the GPU dots", () => {
    expect(dotAnimationForRenderer(undefined)).toBe("gpu");
  });
});

describe("resolveDotAnimation", () => {
  test("an explicit choice is used as is, without asking the GPU", () => {
    expect(resolveDotAnimation("gpu")).toBe("gpu");
    expect(resolveDotAnimation("classic")).toBe("classic");
  });
});

describe("resolveDotAnimation without a browser", () => {
  test("auto keeps the GPU dots when no renderer can be read", () => {
    expect(resolveDotAnimation("auto")).toBe("gpu");
  });
});
