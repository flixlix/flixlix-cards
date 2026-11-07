import { describe, expect, test } from "vite-plus/test";
import { individualLeftBottomElement } from "../src/components/individual-left-bottom-element";
import { individualLeftTopElement } from "../src/components/individual-left-top-element";
import { spacer } from "../src/components/spacer";
import { type IndividualObject } from "../src/states/raw/individual/get-individual-object";
import { type CardMainContext, type NewDur, type TemplatesObj } from "../src/types";
import { fakeConfig, fakeHass } from "./fixtures";

const individualObj: IndividualObject = {
  field: { entity: "sensor.unconfigured" },
  entity: "sensor.unconfigured",
  has: true,
  state: 100,
  displayZero: false,
  displayZeroTolerance: 0,
  icon: "mdi:flash",
  name: "Unconfigured",
  color: null,
  unit_white_space: true,
  invertAnimation: false,
  showDirection: false,
  secondary: {
    entity: null,
    template: null,
    has: false,
    state: null,
    icon: null,
    unit: null,
    unit_white_space: true,
    displayZero: false,
    accept_negative: false,
    displayZeroTolerance: 0,
    decimals: null,
  },
};

const main = { hass: fakeHass() } as CardMainContext;
const config = fakeConfig({ entities: { individual: [{ entity: "sensor.configured" }] } });
const templatesObj: TemplatesObj = {
  gridSecondary: undefined,
  solarSecondary: undefined,
  homeSecondary: undefined,
  nonFossilFuelSecondary: undefined,
  individual: [],
};
const newDur: NewDur = {
  batteryGrid: 0,
  batteryToHome: 0,
  gridToHome: 0,
  solarToBattery: 0,
  solarToGrid: 0,
  solarToHome: 0,
  individual: [],
  nonFossil: 0,
};

describe("left individual elements", () => {
  test.each([individualLeftTopElement, individualLeftBottomElement])(
    "render a spacer for a device missing from the config",
    (element) => {
      expect(element(main, config, { individualObj, templatesObj, displayState: "", newDur })).toBe(
        spacer
      );
    }
  );
});
