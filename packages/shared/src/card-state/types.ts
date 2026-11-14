import { type FossilEnergyConsumption } from "@flixlix-cards/shared/states/utils/energy-period";
import {
  type BatteryObject,
  type EnergyFlowCardPlusConfig,
  type GridObject,
  type HomeObject,
  type IndividualObject,
  type NonFossilObject,
  type PowerFlowCardPlusConfig,
  type SolarObject,
  type TemplatesObj,
} from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { type OrbitGeometry } from "./orbit";

/**
 * What a reading measures. It picks the display units (W or Wh) and which direction a single
 * battery entity counts towards.
 */
export type UnitFamily = "power" | "energy";

export type Readings = { status: "loading" } | ReadyReadings;

/**
 * A grid or battery reading as read from its entities: one entity for both directions, or one
 * entity each for the flow into the node (export, charge) and out of it (import, discharge).
 */
export type TwoWayReading =
  | { kind: "single"; value: number | null }
  | { kind: "split"; into: number | null; outOf: number | null };

/** Entity readings as read, before signs, tolerance or display_zero are applied. */
export type ReadyReadings = {
  status: "ready";
  family: UnitFamily;
  grid: TwoWayReading;
  /** `secondary` is the part of `total` contributed by a summed secondary entity. */
  solar: { total: number | null; secondary: number };
  battery: TwoWayReading;
  /** The home entity's own reading, used when `override_state` is set. */
  home: number | null;
  /** The generator's reading during a power outage. */
  generator: number | null;
  /** Reading of each configured individual device, in config order. */
  individuals: (number | null)[];
  fossilEnergyConsumption?: FossilEnergyConsumption;
};

export type CardStateInput = {
  config: PowerFlowCardPlusConfig | EnergyFlowCardPlusConfig;
  /** Used for names, icons, translations and non-numeric entity states only. */
  hass: HomeAssistant;
  readings: Readings;
  templates: TemplatesObj;
  /** Card content width in pixels. */
  width: number;
  /** Dots are not animated while the page is hidden. */
  pageHidden?: boolean;
  /** No grid, solar or battery entity: the card shows only individual devices around the home. */
  deviceOnly?: boolean;
};

export type FlowName =
  | "batteryGrid"
  | "batteryToHome"
  | "gridToHome"
  | "solarToBattery"
  | "solarToGrid"
  | "solarToHome"
  | "nonFossil";

export type Flow = {
  value: number;
  durationSeconds: number;
  /** Whether the line is drawn at all. */
  visible: boolean;
  /** Classes that grey out or fade the line while nothing flows. */
  lineClass: string;
};

export type Flows = Record<FlowName, Flow> & { individual: Flow[] };

export type IndividualSlot = { node: IndividualObject; flow: Flow };

/** A device on the orbit around the home, with where it sits and the colours it is drawn in. */
export type OrbitDevice = IndividualSlot & {
  /** Position in the config's `individual` list: what the device's default colour follows. */
  index: number;
  x: number;
  y: number;
  labelAbove: boolean;
  /** CSS custom properties that colour the device, its line and its dot. */
  style: string;
};

export type OrbitState = { geometry: OrbitGeometry; devices: OrbitDevice[] };

export type HomeRing = {
  battery: number;
  solar: number;
  grid: number;
  nonFossil: number;
  largestSource: "battery" | "solar" | "grid" | "gridNonFossil";
  usageText: string;
  /** No source supplies the home, so it has no segments and gets a plain border instead. */
  plain: boolean;
};

export type CardLayout = {
  showTopRow: boolean;
  showBottomRow: boolean;
  hasRightIndividual: boolean;
  showHomeLabel: boolean;
};

export type ReadyCardState = {
  status: "ready";
  nodes: {
    grid: GridObject;
    solar: SolarObject;
    battery: BatteryObject;
    home: HomeObject;
    nonFossil: NonFossilObject;
    /** Visible individual devices, sorted when configured. */
    individuals: IndividualObject[];
  };
  /** Set instead of the slots when the card has no grid, solar or battery. */
  orbit?: OrbitState;
  individualSlots: {
    leftTop?: IndividualSlot;
    leftBottom?: IndividualSlot;
    rightTop?: IndividualSlot;
    rightBottom?: IndividualSlot;
  };
  homeRing: HomeRing;
  /**
   * Home consumption as balanced from the sources, the home entity's reading when
   * `override_state` is set, and the difference measured − balanced (0 without a measurement).
   */
  homeBalance: { balanced: number; measured: number | undefined; unaccounted: number };
  flows: Flows;
  /** Whether flow dots are animated. */
  animate: boolean;
  cssVars: Record<`--${string}`, string>;
  layout: CardLayout;
};

export type CardState = { status: "loading" } | ReadyCardState;
