import { BatteryCharging, House, Sun, UtilityPole } from "lucide-react";
import * as React from "react";

import { cn } from "@flixlix-cards/cn";

// Layout and styling mirror the real power-flow-card-plus:
// circles in a diamond (solar top, grid left, home right, battery bottom),
// elbow lines from packages/shared/src/components/flows/*, HA energy colors
// from packages/shared/src/style/index.ts.
const COLORS = {
  solar: "#ff9800",
  grid: "#488fc2",
  return: "#8353d1",
  batteryIn: "#f06292",
  batteryOut: "#4db6ac",
};

const R = 40;
const SOLAR = { x: 230, y: 66 };
const GRID = { x: 60, y: 190 };
const HOME = { x: 400, y: 190 };
const BATTERY = { x: 230, y: 314 };

// Same construction as the card's `M55,0 v15 c0,35 10,35 30,35 h25`:
// a short drop, then one wide sweep (both cubic controls at the target
// height), then a short horizontal run into the circle. Authored as a start
// point + relative segments so a dot can rest exactly at the start before
// its SMIL animation kicks in.
type Flow = { start: { x: number; y: number }; segments: string };

const FLOWS = {
  solarToHome: { start: { x: 242, y: 106 }, segments: "v14 c0,56 23,56 70,56 h60" },
  solarToGrid: { start: { x: 218, y: 106 }, segments: "v14 c0,56 -23,56 -70,56 h-60" },
  gridToHome: { start: { x: 88, y: 190 }, segments: "h284" },
  solarToBattery: { start: { x: 230, y: 106 }, segments: "v168" },
  batteryToHome: { start: { x: 242, y: 274 }, segments: "v-14 c0,-56 23,-56 70,-56 h60" },
  batteryToGrid: { start: { x: 218, y: 274 }, segments: "v-14 c0,-56 -23,-56 -70,-56 h-60" },
} satisfies Record<string, Flow>;

function flowPath(flow: Flow): string {
  return `M${flow.start.x},${flow.start.y} ${flow.segments}`;
}

function FlowDot({
  flow,
  dur,
  begin,
  color,
}: {
  flow: Flow;
  dur: string;
  begin?: string;
  color: string;
}) {
  // The dot is statically positioned at the path start; the motion path is
  // relative (from 0,0) so it stays put until the animation starts.
  return (
    <g transform={`translate(${flow.start.x}, ${flow.start.y})`}>
      <circle r="4" fill={color}>
        <animateMotion
          dur={dur}
          begin={begin}
          repeatCount="indefinite"
          calcMode="paced"
          path={`M0,0 ${flow.segments}`}
        />
      </circle>
    </g>
  );
}

function Node({
  x,
  y,
  icon: Icon,
  label,
  labelAbove = false,
  value,
  color,
  iconColor,
  ring,
}: {
  x: number;
  y: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  labelAbove?: boolean;
  value: string;
  color: string;
  iconColor?: string;
  /** Extra border arcs (proportional sections, like the card's home circle). */
  ring?: React.ReactNode;
}) {
  return (
    <g>
      <text
        x={x}
        y={labelAbove ? y - R - 12 : y + R + 20}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {label}
      </text>
      <circle cx={x} cy={y} r={R} stroke={color} strokeWidth="2" className="fill-card" />
      {ring}
      <g transform={`translate(${x - 12}, ${y - 24})`}>
        <Icon className="size-6" style={{ color: iconColor ?? color }} />
      </g>
      <text x={x} y={y + 16} textAnchor="middle" className="fill-foreground font-mono text-[11px]">
        {value}
      </text>
    </g>
  );
}

/**
 * Decorative hero diagram echoing power-flow-card-plus on a sunny day:
 * solar covers the home and charges the battery, a little grid import on top.
 */
export function HeroFlow({ className }: { className?: string }) {
  const homeCircumference = 2 * Math.PI * R;
  const homeSolarShare = 0.85;

  return (
    <svg
      viewBox="0 0 460 384"
      role="img"
      aria-label="Animated diagram of power flowing between solar, grid, battery and home"
      className={cn("select-none", className)}
    >
      <g fill="none" strokeWidth="2">
        <path d={flowPath(FLOWS.solarToGrid)} className="stroke-foreground/10" />
        <path d={flowPath(FLOWS.batteryToHome)} className="stroke-foreground/10" />
        <path d={flowPath(FLOWS.batteryToGrid)} className="stroke-foreground/10" />
        <path d={flowPath(FLOWS.solarToHome)} stroke={COLORS.solar} />
        <path d={flowPath(FLOWS.gridToHome)} stroke={COLORS.grid} />
        <path d={flowPath(FLOWS.solarToBattery)} stroke={COLORS.batteryIn} />
      </g>

      <g className="motion-reduce:hidden">
        <FlowDot flow={FLOWS.solarToHome} dur="2.8s" color={COLORS.solar} />
        <FlowDot flow={FLOWS.gridToHome} dur="4.6s" begin="0.8s" color={COLORS.grid} />
        <FlowDot flow={FLOWS.solarToBattery} dur="3.6s" begin="0.4s" color={COLORS.batteryIn} />
      </g>

      <Node
        x={SOLAR.x}
        y={SOLAR.y}
        icon={Sun}
        label="Solar"
        labelAbove
        value="3.2 kW"
        color={COLORS.solar}
      />
      <Node
        x={GRID.x}
        y={GRID.y}
        icon={UtilityPole}
        label="Grid"
        value="0.4 kW"
        color={COLORS.grid}
      />
      <Node
        x={HOME.x}
        y={HOME.y}
        icon={House}
        label="Home"
        value="2.7 kW"
        color={COLORS.grid}
        ring={
          <circle
            cx={HOME.x}
            cy={HOME.y}
            r={R}
            fill="none"
            stroke={COLORS.solar}
            strokeWidth="2"
            strokeDasharray={`${homeSolarShare * homeCircumference} ${homeCircumference}`}
            transform={`rotate(-90 ${HOME.x} ${HOME.y})`}
          />
        }
      />
      <Node
        x={BATTERY.x}
        y={BATTERY.y}
        icon={BatteryCharging}
        label="Battery"
        value="76 %"
        color={COLORS.batteryIn}
      />
    </svg>
  );
}
