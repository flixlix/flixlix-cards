import {
  type HomeAssistant,
  fireEvent,
  forwardHaptic,
  navigate,
  toggleEntity,
} from "custom-card-helpers";
import {
  type ActionConfigExtended,
  type CallServiceActionConfig,
  type MoreInfoActionConfig,
} from "./types";

interface ToastActionParams {
  action: () => void;
  text: string;
}
interface ShowToastParams {
  message: string;
  action?: ToastActionParams;
  duration?: number;
  dismissable?: boolean;
}
const showToast = (el: HTMLElement, params: ShowToastParams) =>
  fireEvent(el, "hass-notification", params);

export const handleAction = (
  node: HTMLElement,
  hass: HomeAssistant,
  config: {
    entity_id: string;
    hold_action?: ActionConfigExtended;
    tap_action?: ActionConfigExtended;
    double_tap_action?: ActionConfigExtended;
  },
  action: string
): void => {
  let actionConfig = config.tap_action;

  if (action === "double_tap" && config.double_tap_action) {
    actionConfig = config.double_tap_action;
  } else if (action === "hold" && config.hold_action) {
    actionConfig = config.hold_action;
  }

  if (!actionConfig) {
    actionConfig = {
      action: "more-info",
    };
  }

  if (
    actionConfig.confirmation &&
    (!actionConfig.confirmation.exemptions ||
      !actionConfig.confirmation.exemptions.some((e) => e.user === hass!.user!.id))
  ) {
    forwardHaptic("warning");

    if (
      !confirm(
        actionConfig.confirmation.text ||
          hass.localize(
            "ui.panel.lovelace.cards.actions.action_confirmation",
            "action",
            hass.localize(
              "ui.panel.lovelace.editor.action-editor.actions." + actionConfig.action
            ) || actionConfig.action
          )
      )
    ) {
      return;
    }
  }

  switch (actionConfig.action) {
    case "more-info": {
      const moreInfo = actionConfig as MoreInfoActionConfig;
      const fromData = moreInfo.data?.entity_id;
      const entityFromData = Array.isArray(fromData) ? fromData[0] : fromData;
      fireEvent(node, "hass-more-info", {
        entityId: moreInfo.entity ?? entityFromData ?? config.entity_id,
      });
      break;
    }
    case "navigate":
      if (actionConfig.navigation_path) {
        navigate(node, actionConfig.navigation_path);
      } else {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_navigation_path"),
        });
        forwardHaptic("failure");
      }
      break;
    case "url": {
      if (actionConfig.url_path) {
        window.open(actionConfig.url_path);
      } else {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_url"),
        });
        forwardHaptic("failure");
      }
      break;
    }
    case "toggle": {
      toggleEntity(hass, config.entity_id);
      forwardHaptic("light");
      break;
    }
    case "call-service": {
      if (!actionConfig.service) {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_service"),
        });
        forwardHaptic("failure");
        return;
      }
      const callService = actionConfig as CallServiceActionConfig;
      const [domain, serviceName] = callService.service.split(".", 2);
      if (!domain || !serviceName) {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_service"),
        });
        forwardHaptic("failure");
        return;
      }
      hass.callService(
        domain,
        serviceName,
        callService.data ?? callService.service_data,
        callService.target
      );
      forwardHaptic("light");
      break;
    }
    case "fire-dom-event": {
      fireEvent(node, "ll-custom", actionConfig);
    }
  }
};

declare global {
  interface HASSDomEvents {
    "hass-notification": ShowToastParams;
  }
}
