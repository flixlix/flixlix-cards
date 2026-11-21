import { describe, expect, test } from "vite-plus/test";
import { EnergyPeriodSelectorPlus } from "./energy-period-selector-plus";

const setConfig = (config: object) => () =>
  new EnergyPeriodSelectorPlus().setConfig({
    type: "custom:energy-period-selector-plus",
    ...config,
  });

describe("setConfig", () => {
  test("accepts the options of the standalone card", () => {
    expect(
      setConfig({
        card_background: true,
        title: "Period",
        prev_next_buttons: false,
        today_button_type: "icon",
        compare_button_type: "text",
        compare_button_label: "Vs. before",
        period_buttons: ["month", "custom"],
        custom_period_label: "Range",
      })
    ).not.toThrow();
  });

  test("rejects collection keys HA would reject", () => {
    expect(setConfig({ collection_key: "custom" })).toThrow(/energy_/);
    expect(setConfig({ collection_key: "energy_custom" })).not.toThrow();
  });

  test("rejects unknown period buttons", () => {
    expect(setConfig({ period_buttons: ["day", "decade"] })).toThrow(/period_buttons/);
    expect(setConfig({ period_buttons: "day" })).toThrow(/period_buttons/);
  });

  test("accepts periods the user defines, and says which entry is wrong", () => {
    expect(
      setConfig({
        period_buttons: [
          "day",
          { label: "Bill", duration: { months: 1 }, starts: "2026-01-08" },
          { label: "Last 30 days", duration: { days: 30 } },
        ],
      })
    ).not.toThrow();
    expect(setConfig({ period_buttons: ["day", { label: "Bill" }] })).toThrow(/entry 2 .*duration/);
  });
});
