import { type BatteryObject } from "@flixlix-cards/shared/states/raw/battery";
import {
  type Battery,
  type CardMainContext,
  type FlowCardPlusConfig,
} from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { html, nothing } from "lit";

const getBatteryClickTarget = (batteryConfig: Battery | undefined) => {
  if (batteryConfig?.state_of_charge) return batteryConfig.state_of_charge;
  if (typeof batteryConfig?.entity === "string") return batteryConfig.entity;
  return batteryConfig?.entity?.production;
};

const getBatteryInTarget = (batteryConfig: Battery) =>
  typeof batteryConfig.entity === "string" ? batteryConfig.entity : batteryConfig.entity.production;

const getBatteryOutTarget = (batteryConfig: Battery) =>
  typeof batteryConfig.entity === "string"
    ? batteryConfig.entity
    : batteryConfig.entity.consumption;

export const batteryElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  {
    battery,
    batteryConfig,
  }: {
    battery: BatteryObject;
    batteryConfig: Battery;
  }
) => {
  const disableEntityClick = config.clickable_entities === false;
  const circleStyles: string[] = [];
  if (battery.color.toBattery && typeof battery.color.toBattery === "string") {
    circleStyles.push(`--energy-battery-in-color: ${battery.color.toBattery}`);
  }
  if (battery.color.fromBattery && typeof battery.color.fromBattery === "string") {
    circleStyles.push(`--energy-battery-out-color: ${battery.color.fromBattery}`);
  }
  const circleStyle = circleStyles.join("; ");

  return html`<div class="circle-container battery" style=${circleStyle || nothing}>
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      @click=${(e: MouseEvent) => {
        main.onEntityClick(e, battery, getBatteryClickTarget(batteryConfig));
      }}
      @dblclick=${(e: MouseEvent) => {
        main.onEntityDoubleClick(e, battery, getBatteryClickTarget(batteryConfig));
      }}
      @pointerdown=${(e: PointerEvent) => {
        main.onEntityPointerDown(e, battery, getBatteryClickTarget(batteryConfig));
      }}
      @pointerup=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @pointercancel=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
        if (e.key === "Enter") {
          main.openDetails(e, battery, getBatteryClickTarget(batteryConfig), "tap");
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${battery.state_of_charge.state !== null && batteryConfig.show_state_of_charge !== false
        ? html` <span
            @click=${(e: MouseEvent) => {
              main.onEntityClick(e, battery, batteryConfig.state_of_charge);
            }}
            @dblclick=${(e: MouseEvent) => {
              main.onEntityDoubleClick(e, battery, batteryConfig.state_of_charge);
            }}
            @pointerdown=${(e: PointerEvent) => {
              main.onEntityPointerDown(e, battery, batteryConfig.state_of_charge);
            }}
            @pointerup=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @pointercancel=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
              if (e.key === "Enter") {
                main.openDetails(e, battery, batteryConfig.state_of_charge, "tap");
              }
            }}
            id="battery-state-of-charge-text"
          >
            ${displayValue(main.hass, config, battery.state_of_charge.state, {
              unit: battery.state_of_charge.unit ?? "%",
              unitWhiteSpace: battery.state_of_charge.unit_white_space,
              decimals: battery.state_of_charge.decimals,
              accept_negative: true,
            })}
          </span>`
        : nothing}
      ${battery.icon !== " "
        ? html` <ha-icon
            id="battery-icon"
            .icon=${battery.icon}
            @click=${(e: MouseEvent) => {
              main.onEntityClick(e, battery, batteryConfig.state_of_charge);
            }}
            @dblclick=${(e: MouseEvent) => {
              main.onEntityDoubleClick(e, battery, batteryConfig.state_of_charge);
            }}
            @pointerdown=${(e: PointerEvent) => {
              main.onEntityPointerDown(e, battery, batteryConfig.state_of_charge);
            }}
            @pointerup=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @pointercancel=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
              if (e.key === "Enter") {
                main.openDetails(e, battery, batteryConfig.state_of_charge, "tap");
              }
            }}
          ></ha-icon>`
        : nothing}
      ${batteryConfig.display_state === "two_way" ||
      batteryConfig.display_state === undefined ||
      (batteryConfig.display_state === "one_way_no_zero" && (battery.state.toBattery ?? 0) > 0) ||
      (batteryConfig.display_state === "one_way" && battery.state.toBattery !== 0)
        ? html`<span
            class="battery-in"
            @click=${(e: MouseEvent) => {
              main.onEntityClick(e, batteryConfig, getBatteryInTarget(batteryConfig));
            }}
            @dblclick=${(e: MouseEvent) => {
              main.onEntityDoubleClick(e, batteryConfig, getBatteryInTarget(batteryConfig));
            }}
            @pointerdown=${(e: PointerEvent) => {
              main.onEntityPointerDown(e, batteryConfig, getBatteryInTarget(batteryConfig));
            }}
            @pointerup=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @pointercancel=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
              if (e.key === "Enter") {
                main.openDetails(e, batteryConfig, getBatteryInTarget(batteryConfig), "tap");
              }
            }}
          >
            <ha-icon class="small" .icon=${"mdi:arrow-down"}></ha-icon>
            ${displayValue(main.hass, config, battery.state.toBattery, {
              unit: battery.unit,
              unitWhiteSpace: battery.unit_white_space,
              decimals: battery.decimals,
            })}</span
          >`
        : nothing}
      ${batteryConfig.display_state === "two_way" ||
      batteryConfig.display_state === undefined ||
      (batteryConfig.display_state === "one_way_no_zero" && (battery.state.fromBattery ?? 0) > 0) ||
      (batteryConfig.display_state === "one_way" &&
        (battery.state.toBattery === 0 || battery.state.fromBattery !== 0))
        ? html`<span
            class="battery-out"
            @click=${(e: MouseEvent) => {
              main.onEntityClick(e, batteryConfig, getBatteryOutTarget(batteryConfig));
            }}
            @dblclick=${(e: MouseEvent) => {
              main.onEntityDoubleClick(e, batteryConfig, getBatteryOutTarget(batteryConfig));
            }}
            @pointerdown=${(e: PointerEvent) => {
              main.onEntityPointerDown(e, batteryConfig, getBatteryOutTarget(batteryConfig));
            }}
            @pointerup=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @pointercancel=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
              if (e.key === "Enter") {
                main.openDetails(e, batteryConfig, getBatteryOutTarget(batteryConfig), "tap");
              }
            }}
          >
            <ha-icon class="small" .icon=${"mdi:arrow-up"}></ha-icon>
            ${displayValue(main.hass, config, battery.state.fromBattery, {
              unit: battery.unit,
              unitWhiteSpace: battery.unit_white_space,
              decimals: battery.decimals,
            })}</span
          >`
        : nothing}
    </div>
    <span class="label">${battery.name}</span>
  </div>`;
};

export const batteriesElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  batteries: BatteryObject[]
) => {
  const visible = batteries.filter((battery) => battery.has);
  const first = visible[0];
  if (!first) return nothing;
  if (visible.length === 1) {
    return batteryElement(main, config, {
      battery: first,
      batteryConfig: first.config,
    });
  }
  return html`<div class="batteries">
    ${visible.map((battery) =>
      batteryElement(main, config, {
        battery,
        batteryConfig: battery.config,
      })
    )}
  </div>`;
};
