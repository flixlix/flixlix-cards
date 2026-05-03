import { type HomeAssistant, formatNumber } from "custom-card-helpers";
import {
  type EnergyBreakdownCardConfig,
  type EnergyBreakdownEntityConfig,
  type ResolvedSegment,
} from "./types";

const DEFAULT_PALETTE = [
  "var(--energy-solar-color, #ff9800)",
  "var(--energy-grid-consumption-color, #488fc2)",
  "var(--energy-battery-out-color, #4db6ac)",
  "var(--energy-non-fossil-color, #0f9d58)",
  "var(--energy-gas-color, #8161a8)",
  "var(--energy-water-color, #29b6f6)",
  "#ef5350",
  "#ab47bc",
  "#26a69a",
  "#ec407a",
  "#7e57c2",
  "#26c6da",
];

const NAME_COLOR_HINTS: Array<{ test: RegExp; color: string }> = [
  { test: /(solar|pv|photovoltaic|inverter)/i, color: "var(--energy-solar-color, #ff9800)" },
  { test: /(grid|utility|net|meter)/i, color: "var(--energy-grid-consumption-color, #488fc2)" },
  { test: /battery/i, color: "var(--energy-battery-out-color, #4db6ac)" },
  { test: /(fossil|renewable|non[_-]fossil)/i, color: "var(--energy-non-fossil-color, #0f9d58)" },
  { test: /gas/i, color: "var(--energy-gas-color, #8161a8)" },
  { test: /water/i, color: "var(--energy-water-color, #29b6f6)" },
];

export function pickColor(
  config: EnergyBreakdownEntityConfig,
  fallbackName: string,
  index: number
): string {
  if (config.color) return config.color;
  const hint = NAME_COLOR_HINTS.find(
    (h) => h.test.test(config.entity ?? "") || h.test.test(fallbackName ?? "")
  )?.color;
  if (hint) return hint;
  return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length] ?? DEFAULT_PALETTE[0]!;
}

export function getEntityNumericState(hass: HomeAssistant, entity: string): number {
  const state = hass.states[entity]?.state;
  if (state === undefined || state === null) return 0;
  const n = Number(state);
  return Number.isFinite(n) ? n : 0;
}

export function getEntityFriendlyName(hass: HomeAssistant, entity: string): string {
  return (
    (hass.states[entity]?.attributes.friendly_name as string | undefined) ?? entity ?? "Unknown"
  );
}

export function getEntityIcon(hass: HomeAssistant, entity?: string): string | undefined {
  if (!entity) return undefined;
  return hass.states[entity]?.attributes.icon as string | undefined;
}

export function getEntityUnit(hass: HomeAssistant, entity?: string): string | undefined {
  if (!entity) return undefined;
  return hass.states[entity]?.attributes.unit_of_measurement as string | undefined;
}

export function formatValue(
  hass: HomeAssistant,
  value: number,
  unit: string,
  decimals: number | undefined
): string {
  const decs = typeof decimals === "number" ? decimals : value < 10 ? 2 : value < 100 ? 1 : 0;
  const v = formatNumber(round(value, decs), hass.locale);
  return unit ? `${v} ${unit}` : v;
}

function round(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

export function resolveSegments(
  hass: HomeAssistant,
  config: EnergyBreakdownCardConfig,
  resolveValue: (entity: string) => number = (entity) => getEntityNumericState(hass, entity)
): { segments: ResolvedSegment[]; total: number } {
  const fallbackUnit = config.unit_of_measurement ?? "";
  const list: ResolvedSegment[] = (config.entities ?? []).map((entityConfig, index) => {
    const friendlyName = getEntityFriendlyName(hass, entityConfig.entity);
    const name = entityConfig.name ?? friendlyName;
    const raw = entityConfig.entity ? resolveValue(entityConfig.entity) : 0;
    const value = Math.max(0, raw * (entityConfig.multiplier ?? 1));
    const unit =
      entityConfig.unit_of_measurement ?? getEntityUnit(hass, entityConfig.entity) ?? fallbackUnit;
    const color = pickColor(entityConfig, friendlyName, index);
    const icon = entityConfig.icon ?? getEntityIcon(hass, entityConfig.entity);
    return {
      key: entityConfig.entity ?? `item-${index}`,
      entity: entityConfig.entity,
      name,
      icon,
      color,
      value,
      percent: 0,
      unit,
      decimals: entityConfig.decimals ?? config.decimals,
      config: entityConfig,
    };
  });

  let prepared = list;
  if (config.sort !== false) {
    prepared = [...prepared].sort((a, b) => b.value - a.value);
  }

  const max = config.max_items;
  if (typeof max === "number" && max > 0 && prepared.length > max) {
    if (config.group_others !== false) {
      const top = prepared.slice(0, max);
      const rest = prepared.slice(max);
      const otherValue = rest.reduce((acc, item) => acc + item.value, 0);
      if (otherValue > 0) {
        top.push({
          key: "__other__",
          name: "Other",
          color: "var(--secondary-text-color, #999)",
          value: otherValue,
          percent: 0,
          unit: prepared[0]?.unit ?? fallbackUnit,
        });
      }
      prepared = top;
    } else {
      prepared = prepared.slice(0, max);
    }
  }

  const total = prepared.reduce((acc, s) => acc + s.value, 0);
  if (total > 0) {
    prepared = prepared.map((s) => ({ ...s, percent: (s.value / total) * 100 }));
  }
  return { segments: prepared, total };
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

const FULL_CIRCLE_THRESHOLD = 359.999;

export function describeDonutSegment(opts: {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  cornerRadius: number;
}): string {
  const { cx, cy, innerRadius: rI, outerRadius: rO, startAngle, endAngle } = opts;
  const angleSpan = endAngle - startAngle;
  if (angleSpan <= 0 || rO <= rI) return "";
  if (angleSpan >= FULL_CIRCLE_THRESHOLD) {
    return describeFullDonut(cx, cy, rI, rO);
  }

  const ringWidth = rO - rI;
  let cr = Math.max(0, Math.min(opts.cornerRadius, ringWidth / 2));

  if (cr <= 0) {
    return describePlainSegment(cx, cy, rI, rO, startAngle, endAngle);
  }

  // Clamp by angular size: each cap consumes asin(cr / (rI + cr)) on the inner side.
  // Need 2 * dInner <= angleSpan, otherwise the corners overrun the segment middle.
  const halfSpanRad = (angleSpan / 2) * (Math.PI / 180);
  const sinHalf = Math.sin(halfSpanRad);
  if (sinHalf > 0 && sinHalf < 1) {
    const crCapByAngle = (rI * sinHalf) / (1 - sinHalf);
    cr = Math.min(cr, crCapByAngle);
  }
  if (cr <= 0.01) {
    return describePlainSegment(cx, cy, rI, rO, startAngle, endAngle);
  }

  const radToDeg = 180 / Math.PI;
  // Tangent-angle offsets (radians) and the radial distances at which each
  // corner arc kisses the start/end radial lines.
  const dOuterDeg = Math.asin(cr / (rO - cr)) * radToDeg;
  const dInnerDeg = Math.asin(cr / (rI + cr)) * radToDeg;
  const rOuterAlong = Math.sqrt((rO - cr) * (rO - cr) - cr * cr);
  const rInnerAlong = Math.sqrt((rI + cr) * (rI + cr) - cr * cr);

  const a0o = startAngle + dOuterDeg;
  const a1o = endAngle - dOuterDeg;
  const a0i = startAngle + dInnerDeg;
  const a1i = endAngle - dInnerDeg;

  const pOuterStart = polarToCartesian(cx, cy, rO, a0o);
  const pOuterEnd = polarToCartesian(cx, cy, rO, a1o);
  const pInnerEnd = polarToCartesian(cx, cy, rI, a1i);
  const pInnerStart = polarToCartesian(cx, cy, rI, a0i);
  const pEndOuterTangent = polarToCartesian(cx, cy, rOuterAlong, endAngle);
  const pEndInnerTangent = polarToCartesian(cx, cy, rInnerAlong, endAngle);
  const pStartOuterTangent = polarToCartesian(cx, cy, rOuterAlong, startAngle);
  const pStartInnerTangent = polarToCartesian(cx, cy, rInnerAlong, startAngle);

  const largeOuter = a1o - a0o > 180 ? 1 : 0;
  const largeInner = a1i - a0i > 180 ? 1 : 0;

  return [
    `M ${pOuterStart.x} ${pOuterStart.y}`,
    `A ${rO} ${rO} 0 ${largeOuter} 1 ${pOuterEnd.x} ${pOuterEnd.y}`,
    `A ${cr} ${cr} 0 0 1 ${pEndOuterTangent.x} ${pEndOuterTangent.y}`,
    `L ${pEndInnerTangent.x} ${pEndInnerTangent.y}`,
    `A ${cr} ${cr} 0 0 1 ${pInnerEnd.x} ${pInnerEnd.y}`,
    `A ${rI} ${rI} 0 ${largeInner} 0 ${pInnerStart.x} ${pInnerStart.y}`,
    `A ${cr} ${cr} 0 0 1 ${pStartInnerTangent.x} ${pStartInnerTangent.y}`,
    `L ${pStartOuterTangent.x} ${pStartOuterTangent.y}`,
    `A ${cr} ${cr} 0 0 1 ${pOuterStart.x} ${pOuterStart.y}`,
    "Z",
  ].join(" ");
}

function describePlainSegment(
  cx: number,
  cy: number,
  rI: number,
  rO: number,
  startAngle: number,
  endAngle: number
): string {
  const angleSpan = endAngle - startAngle;
  const largeArc = angleSpan > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rO, startAngle);
  const p2 = polarToCartesian(cx, cy, rO, endAngle);
  const p3 = polarToCartesian(cx, cy, rI, endAngle);
  const p4 = polarToCartesian(cx, cy, rI, startAngle);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rO} ${rO} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rI} ${rI} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

function describeFullDonut(cx: number, cy: number, rI: number, rO: number): string {
  return [
    `M ${cx + rO} ${cy}`,
    `A ${rO} ${rO} 0 1 1 ${cx - rO} ${cy}`,
    `A ${rO} ${rO} 0 1 1 ${cx + rO} ${cy}`,
    `Z`,
    `M ${cx + rI} ${cy}`,
    `A ${rI} ${rI} 0 1 0 ${cx - rI} ${cy}`,
    `A ${rI} ${rI} 0 1 0 ${cx + rI} ${cy}`,
    `Z`,
  ].join(" ");
}
