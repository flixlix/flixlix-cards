import { describe, expect, test } from "vite-plus/test";
import { chargeLevel } from "./severity";

const thresholds = { red: 15, yellow: 30 };

describe("charge level", () => {
  test("red below the red threshold, yellow below the yellow one, green above both", () => {
    expect(chargeLevel(5, thresholds)).toBe("red");
    expect(chargeLevel(15, thresholds)).toBe("yellow");
    expect(chargeLevel(29.9, thresholds)).toBe("yellow");
    expect(chargeLevel(30, thresholds)).toBe("green");
    expect(chargeLevel(100, thresholds)).toBe("green");
  });

  test("a threshold left out never applies", () => {
    expect(chargeLevel(5, { yellow: 30 })).toBe("yellow");
    expect(chargeLevel(5, { red: 15 })).toBe("red");
    expect(chargeLevel(20, { red: 15 })).toBe("green");
    expect(chargeLevel(5, {})).toBe("green");
  });

  test("a yellow threshold below the red one leaves no yellow band", () => {
    expect(chargeLevel(10, { red: 30, yellow: 15 })).toBe("red");
    expect(chargeLevel(40, { red: 30, yellow: 15 })).toBe("green");
  });
});
