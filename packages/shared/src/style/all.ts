import { type IndividualObject } from "@flixlix-cards/shared/states/raw/individual/get-individual-object";
import {
  type BatteryObject,
  type ColorValue,
  type ConfigEntities,
  type GridObject,
  type IndividualDeviceType,
  type NonFossilObject,
  type SolarObject,
} from "@flixlix-cards/shared/types";
import { computeColor } from "./colors";
import { convertColorListToHex } from "./convert-color";

type HostWithStyle = {
  style: {
    setProperty: (property: string, value: string) => void;
  };
};

type DynamicStylesInput = {
  grid: GridObject;
  solar: SolarObject;
  entities: ConfigEntities;
  individual: Pick<IndividualObject, "has" | "field">[];
  battery: BatteryObject;
  homeSources: Record<string, { color: string }>;
  homeLargestSource: string;
  nonFossil: NonFossilObject;
  display_zero_lines_transparency?: number;
  display_zero_lines_grey_color?: string | number[];
  isCardWideEnough?: boolean;
};

/** An empty colour (cleared in the editor) falls back like an unset one. */
const cssColor = (color: ColorValue, fallback: string): string => {
  const hex = typeof color === "object" ? convertColorListToHex(color) : color;
  return hex === "" ? fallback : hex;
};

export const allDynamicStyles = (main: HostWithStyle, input: DynamicStylesInput) => {
  const {
    grid,
    solar,
    entities,
    individual,
    battery,
    homeSources,
    homeLargestSource,
    nonFossil,
    display_zero_lines_transparency,
    display_zero_lines_grey_color,
    isCardWideEnough,
  } = input;

  main.style.setProperty(
    "--icon-grid-color",
    grid.color.icon_type === "consumption"
      ? "var(--energy-grid-consumption-color)"
      : grid.color.icon_type === "production"
        ? "var(--energy-grid-return-color)"
        : grid.color.icon_type === "color_dynamically"
          ? (grid.state.fromGrid ?? 0) >= (grid.state.toGrid ?? 0)
            ? "var(--energy-grid-consumption-color)"
            : "var(--energy-grid-return-color)"
          : "var(--primary-text-color)"
  );

  main.style.setProperty(
    "--circle-grid-color",
    grid.color.circle_type === "consumption"
      ? "var(--energy-grid-consumption-color)"
      : grid.color.circle_type === "production"
        ? "var(--energy-grid-return-color)"
        : grid.color.circle_type !== "no_color"
          ? (grid.state.fromGrid ?? 0) >= (grid.state.toGrid ?? 0)
            ? "var(--energy-grid-consumption-color)"
            : "var(--energy-grid-return-color)"
          : "var(--energy-grid-consumption-color)"
  );

  if (grid.color.fromGrid !== undefined) {
    main.style.setProperty(
      "--energy-grid-consumption-color",
      cssColor(grid.color.fromGrid, "#a280db")
    );
  }

  if (grid.color.toGrid !== undefined) {
    main.style.setProperty("--energy-grid-return-color", cssColor(grid.color.toGrid, "#a280db"));
  }

  main.style.setProperty(
    "--secondary-text-grid-color",
    grid.secondary.color.type === "consumption"
      ? "var(--energy-grid-consumption-color)"
      : grid.secondary.color.type === "production"
        ? "var(--energy-grid-return-color)"
        : grid.secondary.color.type === true
          ? (grid.state.fromGrid ?? 0) >= (grid.state.toGrid ?? 0)
            ? "var(--energy-grid-consumption-color)"
            : "var(--energy-grid-return-color)"
          : "var(--primary-text-color)"
  );

  if (entities.grid?.color_value === false) {
    main.style.setProperty("--text-grid-consumption-color", "var(--primary-text-color)");
    main.style.setProperty("--text-grid-return-color", "var(--primary-text-color)");
  } else {
    main.style.setProperty("--text-grid-consumption-color", "var(--energy-grid-consumption-color)");
    main.style.setProperty("--text-grid-return-color", "var(--energy-grid-return-color)");
  }

  main.style.setProperty(
    "--text-solar-color",
    entities.solar?.color_value ? "var(--energy-solar-color)" : "var(--primary-text-color)"
  );

  main.style.setProperty(
    "--secondary-text-solar-color",
    entities.solar?.secondary_info?.color_value
      ? "var(--energy-solar-color)"
      : "var(--primary-text-color)"
  );

  if (entities.solar?.color !== undefined) {
    main.style.setProperty("--energy-solar-color", cssColor(entities.solar.color, "#ff9800"));
  }
  main.style.setProperty(
    "--icon-solar-color",
    entities.solar?.color_icon ? "var(--energy-solar-color)" : "var(--primary-text-color)"
  );

  if (battery.color.fromBattery !== undefined) {
    main.style.setProperty(
      "--energy-battery-out-color",
      cssColor(battery.color.fromBattery, "#4db6ac")
    );
  }
  if (battery.color.toBattery !== undefined) {
    main.style.setProperty(
      "--energy-battery-in-color",
      cssColor(battery.color.toBattery, "#a280db")
    );
  }
  const batteryIconColorType = entities.battery?.color_icon;
  const isBatteryDischarging = (battery.state.fromBattery ?? 0) >= (battery.state.toBattery ?? 0);
  main.style.setProperty(
    "--icon-battery-color",
    batteryIconColorType === "consumption"
      ? "var(--energy-battery-in-color)"
      : batteryIconColorType === "production"
        ? "var(--energy-battery-out-color)"
        : batteryIconColorType === "color_dynamically"
          ? isBatteryDischarging
            ? "var(--energy-battery-out-color)"
            : "var(--energy-battery-in-color)"
          : "var(--primary-text-color)"
  );
  const batteryStateOfChargeColorType = entities.battery?.color_state_of_charge_value;
  main.style.setProperty(
    "--text-battery-state-of-charge-color",
    batteryStateOfChargeColorType === "consumption"
      ? "var(--energy-battery-in-color)"
      : batteryStateOfChargeColorType === "production"
        ? "var(--energy-battery-out-color)"
        : batteryStateOfChargeColorType === "color_dynamically"
          ? isBatteryDischarging
            ? "var(--energy-battery-out-color)"
            : "var(--energy-battery-in-color)"
          : "var(--primary-text-color)"
  );
  main.style.setProperty(
    "--circle-battery-color",
    battery.color.circle_type === "consumption"
      ? "var(--energy-battery-in-color)"
      : battery.color.circle_type === "production"
        ? "var(--energy-battery-out-color)"
        : battery.color.circle_type !== "no_color"
          ? isBatteryDischarging
            ? "var(--energy-battery-out-color)"
            : "var(--energy-battery-in-color)"
          : "var(--energy-battery-in-color)"
  );
  if (entities.battery?.color_value === false) {
    main.style.setProperty("--text-battery-in-color", "var(--primary-text-color)");
    main.style.setProperty("--text-battery-out-color", "var(--primary-text-color)");
  } else {
    main.style.setProperty("--text-battery-in-color", "var(--energy-battery-in-color)");
    main.style.setProperty("--text-battery-out-color", "var(--energy-battery-out-color)");
  }

  if (nonFossil.color !== undefined) {
    main.style.setProperty(
      "--non-fossil-color",
      cssColor(nonFossil.color, "var(--energy-non-fossil-color)")
    );
  }
  main.style.setProperty(
    "--icon-non-fossil-color",
    entities.fossil_fuel_percentage?.color_icon
      ? "var(--non-fossil-color)"
      : "var(--primary-text-color)"
  );
  main.style.setProperty(
    "--text-non-fossil-color",
    entities.fossil_fuel_percentage?.color_value
      ? "var(--non-fossil-color)"
      : "var(--primary-text-color)"
  );
  main.style.setProperty(
    "--secondary-text-non-fossil-color",
    entities.fossil_fuel_percentage?.secondary_info?.color_value
      ? "var(--non-fossil-color)"
      : "var(--primary-text-color)"
  );

  main.style.setProperty(
    "--secondary-text-home-color",
    entities.home?.secondary_info?.color_value
      ? "var(--text-home-color)"
      : "var(--primary-text-color)"
  );
  main.style.setProperty(
    "--icon-home-color",
    computeColor(entities.home?.color_icon, homeSources, homeLargestSource)
  );
  main.style.setProperty(
    "--text-home-color",
    computeColor(entities.home?.color_value, homeSources, homeLargestSource)
  );

  if (entities.home?.circle_animation === false) {
    main.style.setProperty("--home-circle-animation", "none");
  }

  main.style.setProperty(
    "--battery-grid-line",
    (grid.state.toBattery ?? 0) > 0
      ? "var(--energy-grid-consumption-color)"
      : "var(--energy-grid-return-color)"
  );

  main.style.setProperty(
    "--transparency-unused-lines",
    display_zero_lines_transparency ? display_zero_lines_transparency.toString() : "0"
  );

  if (display_zero_lines_grey_color !== undefined) {
    let greyColor = display_zero_lines_grey_color;
    if (typeof greyColor === "object") {
      greyColor = convertColorListToHex(greyColor);
    }
    main.style.setProperty("--greyed-out--line-color", greyColor);
  }

  if (solar.has) {
    if (battery.has) {
      main.style.setProperty("--lines-svg-not-flat-line-height", "106%");
      main.style.setProperty("--lines-svg-not-flat-line-top", "-3%");
      main.style.setProperty(
        "--lines-svg-flat-width",
        isCardWideEnough ? "calc(100% - 160px)" : "calc(100% - 160px)"
      );
      main.style.setProperty("--lines-svg-flat-left", "0");
      main.style.setProperty("--lines-svg-not-flat-left", "0");
    } else {
      main.style.setProperty("--lines-svg-not-flat-line-top", "-2%");
      main.style.setProperty(
        "--lines-svg-flat-width",
        isCardWideEnough ? "calc(100% - 154px)" : "calc(100% - 157px)"
      );
      main.style.setProperty(
        "--lines-svg-not-flat-width",
        isCardWideEnough ? "calc(103% - 172px)" : "calc(103% - 169px)"
      );
      main.style.setProperty("--lines-svg-not-flat-left", "3px");
      main.style.setProperty("--lines-svg-flat-left", "-3px");
    }
  }

  if (individual?.some((ind) => ind.has)) {
    const getStylesForIndividual = (field: Partial<IndividualDeviceType>, index: number) => {
      const colors = ["#d0cc5b", "#964cb5", "#b54c9d", "#5bd0cc"];
      const fieldNames = ["left-top", "left-bottom", "right-top", "right-bottom"];

      const fieldName = fieldNames[index] ?? "left-top";
      const defaultColor = colors[index] ?? "#d0cc5b";

      main.style.setProperty(
        `--individual-${fieldName}-color`,
        field.color === undefined ? defaultColor : cssColor(field.color, defaultColor)
      );

      main.style.setProperty(
        `--icon-individual-${fieldName}-color`,
        field.color_icon !== false
          ? `var(--individual-${fieldName}-color)`
          : "var(--primary-text-color)"
      );
      main.style.setProperty(
        `--text-individual-${fieldName}-color`,
        field.color_value ? `var(--individual-${fieldName}-color)` : "var(--primary-text-color)"
      );
      main.style.setProperty(
        `--secondary-text-individual-${fieldName}-color`,
        field.secondary_info?.color_value
          ? `var(--individual-${fieldName}-color)`
          : "var(--primary-text-color)"
      );
    };
    const individualsShown = individual.filter((i) => i?.has);
    for (
      let index = 0;
      index < (individualsShown.length < 4 ? individualsShown.length : 4);
      index++
    ) {
      const individualShown = individualsShown[index];
      if (!individualShown) {
        continue;
      }
      getStylesForIndividual(individualShown.field ?? {}, index);
    }
  }
};
