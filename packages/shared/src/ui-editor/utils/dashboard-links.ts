import { type CardButton, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { nonEmpty } from "@flixlix-cards/shared/utils/utils";
import { type ActionConfig } from "custom-card-helpers";

export const hasDashboardLinks = (config: FlowCardPlusConfig): boolean =>
  config.dashboard_link !== undefined || config.second_dashboard_link !== undefined;

/** A dashboard link was a plain href, so a full URL leaves Home Assistant and a path stays in it. */
const linkAction = (link: string): ActionConfig =>
  /^[a-z][a-z\d+.-]*:/i.test(link)
    ? { action: "url", url_path: link }
    : { action: "navigate", navigation_path: link };

const linkButton = (
  link: string | undefined,
  label: string | undefined,
  defaultName: string
): CardButton[] => {
  if (link === undefined || link === "") {
    return [];
  }
  const name = nonEmpty(label) ?? nonEmpty(defaultName);
  return [{ ...(name === undefined ? {} : { name }), tap_action: linkAction(link) }];
};

/**
 * Moves the dashboard links into `buttons`, in front of the buttons already there, so the row
 * keeps its order. `defaultName` is the label the card showed for a link without one.
 */
export const dashboardLinksToButtons = <T extends FlowCardPlusConfig>(
  config: T,
  defaultName: string
): T => {
  const buttons: CardButton[] = [
    ...linkButton(config.dashboard_link, config.dashboard_link_label, defaultName),
    ...linkButton(config.second_dashboard_link, config.second_dashboard_link_label, defaultName),
    ...(config.buttons ?? []),
  ];
  const converted: T = { ...config, buttons };
  delete converted.dashboard_link;
  delete converted.dashboard_link_label;
  delete converted.second_dashboard_link;
  delete converted.second_dashboard_link_label;
  if (buttons.length === 0) {
    delete converted.buttons;
  }
  return converted;
};
