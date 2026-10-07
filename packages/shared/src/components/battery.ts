import { type BatteryObject } from "@flixlix-cards/shared/states/raw/get-battery-object";
import { type CardMainContext, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { html, nothing } from "lit";

const getBatteryClickTarget = (battery: BatteryObject) => {
  if (battery.config.state_of_charge) return battery.config.state_of_charge;
  if (typeof battery.config.entity === "string") return battery.config.entity;
  return battery.config.entity?.production;
};

const getBatteryInTarget = (battery: BatteryObject) => {
  if (typeof battery.config.entity === "string") return battery.config.entity;
  return battery.config.entity?.production;
};

const getBatteryOutTarget = (battery: BatteryObject) => {
  if (typeof battery.config.entity === "string") return battery.config.entity;
  return battery.config.entity?.consumption;
};

const shouldShowBatteryIn = (battery: BatteryObject) => {
  const displayState = battery.config.display_state;
  return (
    displayState === "two_way" ||
    displayState === undefined ||
    (displayState === "one_way_no_zero" && battery.state.toBattery > 0) ||
    (displayState === "one_way" && battery.state.toBattery !== 0)
  );
};

const shouldShowBatteryOut = (battery: BatteryObject) => {
  const displayState = battery.config.display_state;
  return (
    displayState === "two_way" ||
    displayState === undefined ||
    (displayState === "one_way_no_zero" && battery.state.fromBattery > 0) ||
    (displayState === "one_way" &&
      (battery.state.toBattery === 0 || battery.state.fromBattery !== 0))
  );
};

const batteryPowerSpans = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  battery: BatteryObject
) => html`
  ${shouldShowBatteryIn(battery)
    ? html`<span
        class="battery-in"
        @click=${(e: MouseEvent) => {
          main.onEntityClick(e, battery.config, getBatteryInTarget(battery));
        }}
        @dblclick=${(e: MouseEvent) => {
          main.onEntityDoubleClick(e, battery.config, getBatteryInTarget(battery));
        }}
        @pointerdown=${(e: PointerEvent) => {
          main.onEntityPointerDown(e, battery.config, getBatteryInTarget(battery));
        }}
        @pointerup=${(e: PointerEvent) => {
          main.onEntityPointerUp(e);
        }}
        @pointercancel=${(e: PointerEvent) => {
          main.onEntityPointerUp(e);
        }}
        @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
          if (e.key === "Enter") {
            main.openDetails(e, battery.config, getBatteryInTarget(battery), "tap");
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
  ${shouldShowBatteryOut(battery)
    ? html`<span
        class="battery-out"
        @click=${(e: MouseEvent) => {
          main.onEntityClick(e, battery.config, getBatteryOutTarget(battery));
        }}
        @dblclick=${(e: MouseEvent) => {
          main.onEntityDoubleClick(e, battery.config, getBatteryOutTarget(battery));
        }}
        @pointerdown=${(e: PointerEvent) => {
          main.onEntityPointerDown(e, battery.config, getBatteryOutTarget(battery));
        }}
        @pointerup=${(e: PointerEvent) => {
          main.onEntityPointerUp(e);
        }}
        @pointercancel=${(e: PointerEvent) => {
          main.onEntityPointerUp(e);
        }}
        @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
          if (e.key === "Enter") {
            main.openDetails(e, battery.config, getBatteryOutTarget(battery), "tap");
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
`;

export const batteryElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  {
    battery,
    index = 0,
    label,
  }: {
    battery: BatteryObject;
    index?: number;
    label?: string;
  }
) => {
  const disableEntityClick = config.clickable_entities === false;
  const clickTarget = getBatteryClickTarget(battery);
  const circleColor =
    battery.color.fromBattery || battery.color.toBattery
      ? battery.state.fromBattery >= battery.state.toBattery
        ? (battery.color.fromBattery as string | undefined)
        : (battery.color.toBattery as string | undefined)
      : undefined;

  return html`<div class="circle-container battery" data-battery-index=${index}>
    <div
      class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
      style=${circleColor ? `border-color: ${circleColor};` : ""}
      @click=${(e: MouseEvent) => {
        main.onEntityClick(e, battery.config, clickTarget);
      }}
      @dblclick=${(e: MouseEvent) => {
        main.onEntityDoubleClick(e, battery.config, clickTarget);
      }}
      @pointerdown=${(e: PointerEvent) => {
        main.onEntityPointerDown(e, battery.config, clickTarget);
      }}
      @pointerup=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @pointercancel=${(e: PointerEvent) => {
        main.onEntityPointerUp(e);
      }}
      @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
        if (e.key === "Enter") {
          main.openDetails(e, battery.config, clickTarget, "tap");
        }
      }}
    >
      <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
      ${battery.state_of_charge.state !== null && battery.config.show_state_of_charge !== false
        ? html` <span
            @click=${(e: MouseEvent) => {
              main.onEntityClick(e, battery.config, battery.config.state_of_charge);
            }}
            @dblclick=${(e: MouseEvent) => {
              main.onEntityDoubleClick(e, battery.config, battery.config.state_of_charge);
            }}
            @pointerdown=${(e: PointerEvent) => {
              main.onEntityPointerDown(e, battery.config, battery.config.state_of_charge);
            }}
            @pointerup=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @pointercancel=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
              if (e.key === "Enter") {
                main.openDetails(e, battery.config, battery.config.state_of_charge, "tap");
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
              main.onEntityClick(e, battery.config, battery.config.state_of_charge);
            }}
            @dblclick=${(e: MouseEvent) => {
              main.onEntityDoubleClick(e, battery.config, battery.config.state_of_charge);
            }}
            @pointerdown=${(e: PointerEvent) => {
              main.onEntityPointerDown(e, battery.config, battery.config.state_of_charge);
            }}
            @pointerup=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @pointercancel=${(e: PointerEvent) => {
              main.onEntityPointerUp(e);
            }}
            @keyDown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
              if (e.key === "Enter") {
                main.openDetails(e, battery.config, battery.config.state_of_charge, "tap");
              }
            }}
          ></ha-icon>`
        : nothing}
      ${batteryPowerSpans(main, config, battery)}
    </div>
    <span class="label">${label ?? battery.name}</span>
  </div>`;
};

export const batteriesElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  {
    battery,
    batteries,
  }: {
    battery: BatteryObject;
    batteries: BatteryObject[];
  }
) => {
  const visibleBatteries = batteries.filter((item) => item.has);
  if (!battery.has && visibleBatteries.length === 0) return nothing;

  if (visibleBatteries.length <= 1) {
    const single = visibleBatteries[0] ?? battery;
    return batteryElement(main, config, { battery: single, index: 0 });
  }

  return batteryElement(main, config, {
    battery,
    index: 0,
    label: battery.name || "Batteries",
  });
};
