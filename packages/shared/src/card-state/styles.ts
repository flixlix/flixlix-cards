import {
  type BatteryObject,
  type ColorValue,
  type ConfigEntities,
  type FlowCardPlusConfig,
  type GridObject,
  type IndividualDeviceType,
  type IndividualObject,
  type NonFossilObject,
  type SolarObject,
} from "@flixlix-cards/shared/types";
import { convertColorListToHex } from "@flixlix-cards/shared/utils/convert-color";
import { type HomeRing } from "./types";

type CssVars = Record<`--${string}`, string>;

type StyledNodes = {
  grid: GridObject;
  solar: SolarObject;
  battery: BatteryObject;
  nonFossil: NonFossilObject;
  auxiliary: IndividualObject;
};

const PRIMARY_TEXT = "var(--primary-text-color)";
const GRID_IN = "var(--energy-grid-consumption-color)";
const GRID_OUT = "var(--energy-grid-return-color)";
const BATTERY_IN = "var(--energy-battery-in-color)";
const BATTERY_OUT = "var(--energy-battery-out-color)";
const GREYED_OUT = "var(--greyed-out--line-color)";

export const HOME_SOURCE_COLORS: Record<HomeRing["largestSource"], string> = {
  battery: BATTERY_OUT,
  solar: "var(--energy-solar-color)",
  grid: GRID_IN,
  gridNonFossil: "var(--energy-non-fossil-color)",
};

/** An empty colour (cleared in the editor) falls back like an unset one. */
const cssColor = (color: ColorValue, fallback: string): string => {
  const hex = typeof color === "object" ? convertColorListToHex(color) : color;
  return hex === "" ? fallback : hex;
};

const homeColor = (colorType: boolean | string | undefined, largest: HomeRing["largestSource"]) => {
  if (colorType === true) {
    return HOME_SOURCE_COLORS[largest];
  }
  const source = Object.entries(HOME_SOURCE_COLORS).find(([key]) => key === colorType);
  return source ? source[1] : PRIMARY_TEXT;
};

const isIdle = (...directions: (number | null)[]) =>
  directions.every((value) => (value ?? 0) === 0);

const greysIdleCircles = (config: FlowCardPlusConfig): boolean => {
  const lines = config.display_zero_lines;
  return !!lines?.grey_out_circles && (lines.mode === "grey_out" || lines.mode === "custom");
};

/** The node's own idle colour wins over the greyed-out line colour; undefined keeps the usual one. */
const idleCircleColor = (color: ColorValue | undefined, greyIdle: boolean): string | undefined => {
  const own = color === undefined ? "" : cssColor(color, "");
  if (own !== "") {
    return own;
  }
  return greyIdle ? GREYED_OUT : undefined;
};

/** `color_dynamically`-style choice between a node's two directions. */
const directional = (
  type: unknown,
  consumption: string,
  production: string,
  dynamic: string,
  fallback: string
) => {
  if (type === "consumption") {
    return consumption;
  }
  if (type === "production") {
    return production;
  }
  return dynamic === "" ? fallback : dynamic;
};

const gridVars = ({ grid }: StyledNodes, entities: ConfigEntities, greyIdle: boolean): CssVars => {
  const importing = (grid.state.fromGrid ?? 0) >= (grid.state.toGrid ?? 0);
  const dynamic = importing ? GRID_IN : GRID_OUT;
  const iconType = grid.color.icon_type;
  const circleType = grid.color.circle_type;
  const secondaryType = grid.secondary.color.type;
  const colorValue = entities.grid?.color_value !== false;
  const idle = isIdle(grid.state.fromGrid, grid.state.toGrid)
    ? idleCircleColor(grid.color.idle, greyIdle)
    : undefined;
  return {
    "--icon-grid-color": directional(
      iconType,
      GRID_IN,
      GRID_OUT,
      iconType === "color_dynamically" ? dynamic : "",
      PRIMARY_TEXT
    ),
    "--circle-grid-color":
      idle ??
      directional(circleType, GRID_IN, GRID_OUT, circleType === "no_color" ? "" : dynamic, GRID_IN),
    ...(grid.color.fromGrid === undefined
      ? {}
      : { "--energy-grid-consumption-color": cssColor(grid.color.fromGrid, "#a280db") }),
    ...(grid.color.toGrid === undefined
      ? {}
      : { "--energy-grid-return-color": cssColor(grid.color.toGrid, "#a280db") }),
    "--secondary-text-grid-color": directional(
      secondaryType,
      GRID_IN,
      GRID_OUT,
      secondaryType === true ? dynamic : "",
      PRIMARY_TEXT
    ),
    "--text-grid-consumption-color": colorValue ? GRID_IN : PRIMARY_TEXT,
    "--text-grid-return-color": colorValue ? GRID_OUT : PRIMARY_TEXT,
    ...outageVars(grid),
  };
};

const outageVars = ({ powerOutage }: GridObject): CssVars => {
  const color =
    powerOutage.isOutage && powerOutage.color !== undefined ? cssColor(powerOutage.color, "") : "";
  return color === "" ? {} : { "--icon-grid-color": color, "--text-grid-outage-color": color };
};

const solarVars = (entities: ConfigEntities): CssVars => {
  const solar = entities.solar;
  const solarColor = "var(--energy-solar-color)";
  return {
    "--text-solar-color": solar?.color_value ? solarColor : PRIMARY_TEXT,
    "--secondary-text-solar-color": solar?.secondary_info?.color_value ? solarColor : PRIMARY_TEXT,
    ...(solar?.color === undefined
      ? {}
      : { "--energy-solar-color": cssColor(solar.color, "#ff9800") }),
    "--icon-solar-color": solar?.color_icon ? solarColor : PRIMARY_TEXT,
  };
};

const batteryVars = (
  { battery }: StyledNodes,
  entities: ConfigEntities,
  greyIdle: boolean
): CssVars => {
  const dynamic =
    (battery.state.fromBattery ?? 0) >= (battery.state.toBattery ?? 0) ? BATTERY_OUT : BATTERY_IN;
  const iconType = entities.battery?.color_icon;
  const socType = entities.battery?.color_state_of_charge_value;
  const circleType = battery.color.circle_type;
  const colorValue = entities.battery?.color_value !== false;
  const idle = isIdle(battery.state.fromBattery, battery.state.toBattery)
    ? idleCircleColor(battery.color.idle, greyIdle)
    : undefined;
  return {
    ...(battery.color.fromBattery === undefined
      ? {}
      : { "--energy-battery-out-color": cssColor(battery.color.fromBattery, "#4db6ac") }),
    ...(battery.color.toBattery === undefined
      ? {}
      : { "--energy-battery-in-color": cssColor(battery.color.toBattery, "#a280db") }),
    "--icon-battery-color": directional(
      iconType,
      BATTERY_IN,
      BATTERY_OUT,
      iconType === "color_dynamically" ? dynamic : "",
      PRIMARY_TEXT
    ),
    "--text-battery-state-of-charge-color": directional(
      socType,
      BATTERY_IN,
      BATTERY_OUT,
      socType === "color_dynamically" ? dynamic : "",
      PRIMARY_TEXT
    ),
    "--circle-battery-color":
      idle ??
      directional(
        circleType,
        BATTERY_IN,
        BATTERY_OUT,
        circleType === "no_color" ? "" : dynamic,
        BATTERY_IN
      ),
    "--text-battery-in-color": colorValue ? BATTERY_IN : PRIMARY_TEXT,
    "--text-battery-out-color": colorValue ? BATTERY_OUT : PRIMARY_TEXT,
  };
};

const nonFossilAndHomeVars = (
  { nonFossil }: StyledNodes,
  entities: ConfigEntities,
  largest: HomeRing["largestSource"]
): CssVars => {
  const fossil = entities.fossil_fuel_percentage;
  const nonFossilColor = "var(--non-fossil-color)";
  return {
    ...(nonFossil.color === undefined
      ? {}
      : { "--non-fossil-color": cssColor(nonFossil.color, "var(--energy-non-fossil-color)") }),
    "--icon-non-fossil-color": fossil?.color_icon ? nonFossilColor : PRIMARY_TEXT,
    "--text-non-fossil-color": fossil?.color_value ? nonFossilColor : PRIMARY_TEXT,
    "--secondary-text-non-fossil-color": fossil?.secondary_info?.color_value
      ? nonFossilColor
      : PRIMARY_TEXT,
    "--secondary-text-home-color": entities.home?.secondary_info?.color_value
      ? "var(--text-home-color)"
      : PRIMARY_TEXT,
    "--icon-home-color": homeColor(entities.home?.color_icon, largest),
    "--text-home-color": homeColor(entities.home?.color_value, largest),
    ...(entities.home?.circle_animation === false ? { "--home-circle-animation": "none" } : {}),
  };
};

const lineVars = ({ grid }: StyledNodes, config: FlowCardPlusConfig) => {
  const zeroLines = config.display_zero_lines;
  const transparency = zeroLines?.mode === "transparency" ? zeroLines.transparency : undefined;
  const greys = zeroLines?.mode === "grey_out" || zeroLines?.mode === "custom";
  const greyColor = greys ? zeroLines.grey_color : "";
  const vars: CssVars = {
    "--battery-grid-line": (grid.state.toBattery ?? 0) > 0 ? GRID_IN : GRID_OUT,
    "--transparency-unused-lines": transparency ? transparency.toString() : "0",
  };
  return {
    ...vars,
    ...(greyColor === undefined
      ? {}
      : {
          "--greyed-out--line-color":
            typeof greyColor === "object" ? convertColorListToHex(greyColor) : greyColor,
        }),
  };
};

const INDIVIDUAL_SLOTS = ["left-top", "left-bottom", "right-top", "right-bottom"] as const;
const INDIVIDUAL_COLORS = ["#d0cc5b", "#964cb5", "#b54c9d", "#5bd0cc"] as const;

const idleIndividualCircleVars = (shown: IndividualObject[], greyIdle: boolean): CssVars =>
  Object.fromEntries(
    shown.flatMap((individual, index) => {
      const idle = isIdle(individual.state)
        ? idleCircleColor(individual.field?.color_idle, greyIdle)
        : undefined;
      const slot = INDIVIDUAL_SLOTS[index] ?? "left-top";
      return idle === undefined ? [] : [[`--circle-individual-${slot}-color`, idle]];
    })
  );

const individualVars = (individuals: IndividualObject[], greyIdle: boolean): CssVars => {
  const shown = individuals.filter((individual) => individual.has).slice(0, 4);
  const colorVars: CssVars = Object.fromEntries(
    shown.flatMap((individual, index) => {
      const field: Partial<IndividualDeviceType> = individual.field ?? {};
      const slot = INDIVIDUAL_SLOTS[index] ?? "left-top";
      const defaultColor = INDIVIDUAL_COLORS[index] ?? "#d0cc5b";
      const color = `var(--individual-${slot}-color)`;
      return [
        [
          `--individual-${slot}-color`,
          field.color === undefined ? defaultColor : cssColor(field.color, defaultColor),
        ],
        [`--icon-individual-${slot}-color`, field.color_icon !== false ? color : PRIMARY_TEXT],
        [`--text-individual-${slot}-color`, field.color_value ? color : PRIMARY_TEXT],
        [
          `--secondary-text-individual-${slot}-color`,
          field.secondary_info?.color_value ? color : PRIMARY_TEXT,
        ],
      ];
    })
  );
  return { ...colorVars, ...idleIndividualCircleVars(shown, greyIdle) };
};

const AUXILIARY_COLOR = "#a1887f";

const auxiliaryVars = ({ auxiliary }: StyledNodes, greyIdle: boolean): CssVars => {
  const field: Partial<IndividualDeviceType> = auxiliary.field ?? {};
  const color = "var(--auxiliary-color)";
  const idle = isIdle(auxiliary.state) ? idleCircleColor(field.color_idle, greyIdle) : undefined;
  return {
    "--auxiliary-color":
      field.color === undefined ? AUXILIARY_COLOR : cssColor(field.color, AUXILIARY_COLOR),
    "--icon-auxiliary-color": field.color_icon !== false ? color : PRIMARY_TEXT,
    "--text-auxiliary-color": field.color_value ? color : PRIMARY_TEXT,
    "--secondary-text-auxiliary-color": field.secondary_info?.color_value ? color : PRIMARY_TEXT,
    ...(idle === undefined ? {} : { "--circle-auxiliary-color": idle }),
  };
};

/** CSS custom properties the card sets on its host for colours and line geometry. */
export const computeCssVars = (
  config: FlowCardPlusConfig,
  nodes: StyledNodes,
  largestHomeSource: HomeRing["largestSource"],
  individuals: IndividualObject[]
): CssVars => {
  const { entities } = config;
  const greyIdle = greysIdleCircles(config);
  return {
    "--clickable-cursor": config.clickable_entities ? "pointer" : "default",
    ...gridVars(nodes, entities, greyIdle),
    ...solarVars(entities),
    ...batteryVars(nodes, entities, greyIdle),
    ...nonFossilAndHomeVars(nodes, entities, largestHomeSource),
    ...lineVars(nodes, config),
    ...individualVars(individuals, greyIdle),
    ...auxiliaryVars(nodes, greyIdle),
  };
};
