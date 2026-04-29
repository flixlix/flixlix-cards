import { handleAction } from "@flixlix-cards/shared/ha/panels/lovelace/common/handle-action";
import { type ActionConfig, type HomeAssistant } from "custom-card-helpers";
import { type FlixlixActionConfig } from "../types";

export interface ActionHandlers {
  onClick: (event: MouseEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onDoubleClick: (event: MouseEvent) => void;
}

const HOLD_MS = 500;
const DOUBLE_TAP_MS = 250;

interface ActionState {
  pendingTap?: ReturnType<typeof setTimeout>;
  hold?: ReturnType<typeof setTimeout>;
  holdTriggered?: boolean;
}

export function makeActionHandlers(
  hass: HomeAssistant,
  actions: FlixlixActionConfig | undefined,
  entityId: string | undefined
): ActionHandlers {
  const state: ActionState = {};

  const fire = (target: HTMLElement, action: "tap" | "hold" | "double_tap") => {
    handleAction(
      target,
      hass,
      {
        entity: entityId,
        tap_action: actions?.tap_action ?? ({ action: "more-info" } as ActionConfig),
        hold_action: actions?.hold_action,
        double_tap_action: actions?.double_tap_action,
      },
      action
    );
  };

  return {
    onClick(event: MouseEvent) {
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement | null;
      if (!target) return;
      if (state.holdTriggered) {
        state.holdTriggered = false;
        return;
      }
      if (actions?.double_tap_action) {
        if (state.pendingTap) clearTimeout(state.pendingTap);
        state.pendingTap = setTimeout(() => fire(target, "tap"), DOUBLE_TAP_MS);
        return;
      }
      fire(target, "tap");
    },
    onDoubleClick(event: MouseEvent) {
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement | null;
      if (!target) return;
      if (state.pendingTap) {
        clearTimeout(state.pendingTap);
        state.pendingTap = undefined;
      }
      if (!actions?.double_tap_action) return;
      fire(target, "double_tap");
    },
    onPointerDown(event: PointerEvent) {
      const target = event.currentTarget as HTMLElement | null;
      if (!target || !actions?.hold_action) return;
      if (state.hold) clearTimeout(state.hold);
      state.holdTriggered = false;
      state.hold = setTimeout(() => {
        state.holdTriggered = true;
        fire(target, "hold");
      }, HOLD_MS);
    },
    onPointerUp() {
      if (state.hold) {
        clearTimeout(state.hold);
        state.hold = undefined;
      }
    },
  };
}
