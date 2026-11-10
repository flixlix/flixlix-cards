import localize from "@flixlix-cards/shared/i18n";
import { conditionsPanelHtml } from "@flixlix-cards/shared/ui-editor/components/conditions-panel";
import { mdiEyeOutline, mdiPowerPlugOffOutline } from "@mdi/js";
import { type HomeAssistant } from "custom-card-helpers";
import { type HomeFlowMode } from "../types";

type ConditionList = "visibility" | "idle";

/**
 * The car's conditions: whether it is home, and whether it is idle now, which says nothing about
 * what it did over an energy period.
 */
export const carConditionKeys = (mode: HomeFlowMode | undefined): readonly ConditionList[] =>
  mode === "energy" ? ["visibility"] : ["visibility", "idle"];

/**
 * The car's conditions as YAML, should Home Assistant's own conditions editor not be there: it
 * is defined while a dashboard is being edited, but it is not a public API.
 */
export const carConditionsAsYaml = (mode: HomeFlowMode | undefined) =>
  carConditionKeys(mode).map((key) => ({ name: key, selector: { object: {} } }));

const ICONS: Record<ConditionList, string> = {
  visibility: mdiEyeOutline,
  idle: mdiPowerPlugOffOutline,
};

const isList = (value: unknown): value is unknown[] => Array.isArray(value);

const conditionsOf = (car: Record<string, unknown> | undefined, key: ConditionList): unknown[] => {
  const conditions = car?.[key];
  return isList(conditions) ? conditions : [];
};

/** The car's conditions in `keys`, each in a panel that opens when it holds conditions. */
export const carConditionsHtml = (
  hass: HomeAssistant,
  car: Record<string, unknown> | undefined,
  keys: readonly ConditionList[],
  onChange: (car: Record<string, unknown>) => void
) =>
  keys.map((key) =>
    conditionsPanelHtml(hass, {
      key,
      header: localize(`editor.${key}`),
      hint: localize(`editor.car_${key}_hint`),
      icon: ICONS[key],
      conditions: conditionsOf(car, key),
      onChange: (value) => {
        const { [key]: _old, ...rest } = car ?? {};
        // an empty list is left out, so the default applies again
        onChange(isList(value) && value.length > 0 ? { ...rest, [key]: value } : rest);
      },
    })
  );
