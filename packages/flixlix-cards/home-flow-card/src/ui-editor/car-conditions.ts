import localize from "@flixlix-cards/shared/i18n";
import { conditionsPanelHtml } from "@flixlix-cards/shared/ui-editor/components/conditions-panel";
import { mdiEyeOutline, mdiPowerPlugOffOutline } from "@mdi/js";
import { type HomeAssistant } from "custom-card-helpers";

const LISTS = [
  { key: "visibility", icon: mdiEyeOutline },
  { key: "idle", icon: mdiPowerPlugOffOutline },
] as const;

type ConditionList = (typeof LISTS)[number]["key"];

const isList = (value: unknown): value is unknown[] => Array.isArray(value);

const conditionsOf = (car: Record<string, unknown> | undefined, key: ConditionList): unknown[] => {
  const conditions = car?.[key];
  return isList(conditions) ? conditions : [];
};

/** The car's visibility and idle conditions, each in a panel that opens when it holds conditions. */
export const carConditionsHtml = (
  hass: HomeAssistant,
  car: Record<string, unknown> | undefined,
  onChange: (car: Record<string, unknown>) => void
) =>
  LISTS.map(({ key, icon }) =>
    conditionsPanelHtml(hass, {
      key,
      header: localize(`editor.${key}`),
      hint: localize(`editor.car_${key}_hint`),
      icon,
      conditions: conditionsOf(car, key),
      onChange: (value) => {
        const { [key]: _old, ...rest } = car ?? {};
        // an empty list is left out, so the default applies again
        onChange(isList(value) && value.length > 0 ? { ...rest, [key]: value } : rest);
      },
    })
  );
