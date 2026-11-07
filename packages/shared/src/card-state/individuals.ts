import { getEntityStateObj } from "@flixlix-cards/shared/states/utils/get-entity-state-obj";
import { type IndividualDeviceType, type IndividualObject } from "@flixlix-cards/shared/types";
import {
  computeFieldIcon,
  computeFieldName,
} from "@flixlix-cards/shared/utils/compute-field-attributes";
import { convertColorListToHex } from "@flixlix-cards/shared/utils/convert-color";
import { isNumberValue, nonEmpty, sortedCopy } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";
import { type Formatter } from "./format";
import { type NodeTotals, type Presence } from "./normalize";
import { type CardStateInput, type IndividualSlot, type ReadyCardState } from "./types";

const unconfigured: IndividualObject = {
  field: undefined,
  entity: "",
  has: false,
  state: null,
  displayZero: false,
  displayZeroTolerance: 0,
  icon: "",
  name: "",
  color: null,
  invertAnimation: false,
  showDirection: false,
  displayState: "",
  secondary: {
    entity: undefined,
    icon: undefined,
    text: undefined,
    templateResult: undefined,
    show: false,
  },
};

const secondaryReading = (hass: HomeAssistant, field: IndividualDeviceType) => {
  const entity = field.secondary_info?.entity;
  const state = entity === undefined ? undefined : getEntityStateObj(hass, entity)?.state;
  if (state === undefined || state === "") {
    return null;
  }
  const value = isNumberValue(state) ? Number(state) : state;
  return value === 0 ? null : value;
};

const secondaryShown = (
  info: IndividualDeviceType["secondary_info"],
  state: string | number | null,
  templateResult: string | undefined
): boolean => {
  if (templateResult || info?.display_zero) {
    return true;
  }
  if (!state) {
    return false;
  }
  if (!isNumberValue(state)) {
    return true;
  }
  return Number(state) >= (info?.display_zero_tolerance ?? 0) || !!info?.accept_negative;
};

const individualSecondary = (
  hass: HomeAssistant,
  format: Formatter,
  field: IndividualDeviceType,
  templateResult: string | undefined
): IndividualObject["secondary"] => {
  const info = field.secondary_info;
  const state = secondaryReading(hass, field);
  return {
    entity: nonEmpty(info?.entity),
    icon: nonEmpty(info?.icon),
    text:
      info?.entity === undefined
        ? undefined
        : format(state, {
            unit: nonEmpty(info.unit_of_measurement),
            unitWhiteSpace: info.unit_white_space !== false,
            decimals: info.decimals ?? 0,
            accept_negative: info.accept_negative ?? false,
          }),
    templateResult: nonEmpty(templateResult),
    show: secondaryShown(info, state, templateResult),
    tap_action: info?.tap_action,
    hold_action: info?.hold_action,
    double_tap_action: info?.double_tap_action,
  };
};

const fieldColor = (color: IndividualDeviceType["color"]): string | null => {
  if (typeof color === "string" && color) {
    return color;
  }
  return typeof color === "object" ? convertColorListToHex(color) : null;
};

/** Individual device nodes in config order. */
export const individualNodes = (
  input: CardStateInput,
  totals: NodeTotals,
  presence: Presence,
  format: Formatter
): IndividualObject[] =>
  (input.config.entities.individual ?? []).map((field, index) => {
    if (!field?.entity) {
      return unconfigured;
    }
    const state = totals.individuals[index] ?? 0;
    const displayZero = field.display_zero ?? false;
    const displayZeroTolerance = field.display_zero_tolerance ?? 0;
    return {
      field,
      entity: field.entity,
      has: presence.individuals[index] ?? false,
      state,
      displayZero,
      displayZeroTolerance,
      icon: computeFieldIcon(input.hass, field, "mdi:flash"),
      name: computeFieldName(input.hass, field, "Individual"),
      color: fieldColor(field.color),
      invertAnimation: field.inverted_animation ?? false,
      showDirection: field.show_direction ?? false,
      displayState: format(state, {
        decimals: field.decimals,
        unit: field.unit_of_measurement,
        unitWhiteSpace: field.unit_white_space,
      }),
      secondary: individualSecondary(input.hass, format, field, input.templates.individual[index]),
    };
  });

const byStateThenEntity = (a: IndividualSlot, b: IndividualSlot) =>
  (b.node.state ?? 0) - (a.node.state ?? 0) || a.node.entity.localeCompare(b.node.entity);

/** Cards narrower than this show two individual devices unless `allow_layout_break` is set. */
const WIDTH_FOR_FOUR_INDIVIDUALS = 359;

/** Sorts individual devices if configured and places the visible ones into the four slots. */
export const placeIndividuals = (input: CardStateInput, devices: IndividualSlot[]) => {
  const sorted = input.config.sort_individual_devices
    ? sortedCopy(devices, byStateThenEntity)
    : devices;
  const maxVisible =
    input.config.allow_layout_break || input.width >= WIDTH_FOR_FOUR_INDIVIDUALS ? 4 : 2;
  const visible = sorted.filter((device) => device.node.has).slice(0, maxVisible);
  const [leftTop, leftBottom, rightTop, rightBottom] = visible;
  const slots: ReadyCardState["individualSlots"] = { leftTop, leftBottom, rightTop, rightBottom };
  return { sorted: sorted.map((device) => device.node), visible, slots };
};
