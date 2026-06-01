import { type HomeAssistant } from "custom-card-helpers";
import {
  type ResolvedItem,
  type SortableListCardConfig,
  type SortableListItemConfig,
  type SortableListValueFormat,
} from "./types";

export function itemKey(item: SortableListItemConfig): string {
  return item.key ?? item.entity ?? "";
}

export function configKeys(config: SortableListCardConfig): string[] {
  return (config.items ?? []).map(itemKey).filter(Boolean);
}

export function resolveItems(
  hass: HomeAssistant | undefined,
  config: SortableListCardConfig
): ResolvedItem[] {
  return (config.items ?? [])
    .map((item): ResolvedItem | null => {
      const key = itemKey(item);
      if (!key) return null;
      const stateObj = item.entity ? hass?.states?.[item.entity] : undefined;
      const friendly = stateObj?.attributes?.friendly_name as string | undefined;
      return {
        key,
        entity: item.entity,
        name: item.name ?? friendly ?? item.entity ?? key,
        icon: item.icon ?? (stateObj?.attributes?.icon as string | undefined),
        state: stateObj?.state,
      };
    })
    .filter((i): i is ResolvedItem => i !== null);
}

export function parseStateValue(
  value: string | undefined | null,
  format: SortableListValueFormat = "csv"
): string[] {
  if (!value) return [];
  if (format === "json") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      /* fall through to csv handling */
    }
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatOrder(keys: string[], format: SortableListValueFormat = "csv"): string {
  return format === "json" ? JSON.stringify(keys) : keys.join(",");
}

export function reconcileOrder(keys: string[], fromState: string[]): string[] {
  const known = fromState.filter((k) => keys.includes(k));
  const missing = keys.filter((k) => !known.includes(k));
  return [...known, ...missing];
}

export function resolveOrder(config: SortableListCardConfig, stateValue?: string | null): string[] {
  const format = config.value_format ?? "csv";
  return reconcileOrder(configKeys(config), parseStateValue(stateValue, format));
}

type SubstitutionContext = {
  value: string;
  value_csv: string;
  value_json: string;
  value_list: string[];
};

function substituteString(input: string, ctx: SubstitutionContext): unknown {
  if (input === "{value_list}") return ctx.value_list;
  return input
    .split("{value_csv}")
    .join(ctx.value_csv)
    .split("{value_json}")
    .join(ctx.value_json)
    .split("{value}")
    .join(ctx.value);
}

export function substitute(value: unknown, ctx: SubstitutionContext): unknown {
  if (typeof value === "string") return substituteString(value, ctx);
  if (Array.isArray(value)) return value.map((v) => substitute(v, ctx));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = substitute(v, ctx);
    return out;
  }
  return value;
}

export function effectiveSaveAction(config: SortableListCardConfig) {
  if (config.save_action?.service) return config.save_action;
  if (config.entity) {
    return {
      service: "input_text.set_value",
      data: { entity_id: config.entity, value: "{value}" },
    };
  }
  return undefined;
}

export type ResolvedServiceCall = {
  domain: string;
  service: string;
  serviceData?: Record<string, unknown>;
  target?: Record<string, unknown>;
};

export function buildSaveCall(
  config: SortableListCardConfig,
  order: string[]
): ResolvedServiceCall | null {
  const action = effectiveSaveAction(config);
  if (!action?.service) return null;
  const [domain, service] = action.service.split(".");
  if (!domain || !service) return null;
  const format = config.value_format ?? "csv";
  const ctx: SubstitutionContext = {
    value: formatOrder(order, format),
    value_csv: order.join(","),
    value_json: JSON.stringify(order),
    value_list: order,
  };
  return {
    domain,
    service,
    serviceData: action.data
      ? (substitute(action.data, ctx) as Record<string, unknown>)
      : undefined,
    target: action.target ? (substitute(action.target, ctx) as Record<string, unknown>) : undefined,
  };
}
