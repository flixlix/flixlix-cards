import { handleAction } from "@flixlix-cards/shared/ha/panels/lovelace/common/handle-action";
import { doesEntityExist } from "@flixlix-cards/shared/states/utils/existence-entity";
import { type ActionConfigSet, type CardMainContext } from "@flixlix-cards/shared/types";
import { type ActionConfig, type HomeAssistant } from "custom-card-helpers";

type Action = "tap" | "hold" | "double_tap";

const DOUBLE_TAP_DELAY = 250;
const HOLD_DELAY = 500;

const normalizeActionConfig = (
  config?: ActionConfig | ActionConfigSet
): ActionConfigSet | undefined => {
  if (!config) {
    return undefined;
  }
  if ("tap_action" in config || "hold_action" in config || "double_tap_action" in config) {
    return config;
  }
  return { tap_action: { action: "more-info" } as ActionConfig };
};

const targetOf = (event: Event): HTMLElement | null =>
  event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

/** Tap, double-tap and hold handling for a card's entities. */
export class EntityActions implements CardMainContext {
  private readonly _pendingTapTimeouts = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
  private readonly _holdTimeouts = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
  private readonly _holdTriggered = new WeakMap<HTMLElement, boolean>();

  constructor(
    private readonly _host: HTMLElement,
    private readonly _context: () => { hass: HomeAssistant; clickableEntities: boolean }
  ) {}

  public openDetails(
    event: { stopPropagation: () => void; key?: string; target: HTMLElement },
    config?: ActionConfig | ActionConfigSet,
    entityId?: string,
    action: Action = "tap"
  ): void {
    event.stopPropagation();
    const { hass, clickableEntities } = this._context();
    const normalizedConfig = normalizeActionConfig(config);
    const hasAnyAction = !!(
      normalizedConfig?.tap_action ??
      normalizedConfig?.hold_action ??
      normalizedConfig?.double_tap_action
    );

    if (!hasAnyAction) {
      if (!entityId || !clickableEntities || !doesEntityExist(hass, entityId)) {
        return;
      }
      this._host.dispatchEvent(
        new CustomEvent("hass-more-info", { composed: true, detail: { entityId } })
      );
      return;
    }

    void handleAction(
      event.target,
      hass,
      {
        entity: entityId,
        tap_action: normalizedConfig?.tap_action,
        hold_action: normalizedConfig?.hold_action,
        double_tap_action: normalizedConfig?.double_tap_action,
      },
      action
    );
  }

  private _open(
    event: Event,
    target: HTMLElement,
    config: ActionConfigSet | undefined,
    entityId: string | undefined,
    action: Action
  ) {
    this.openDetails(
      { stopPropagation: () => event.stopPropagation(), target },
      config,
      entityId,
      action
    );
  }

  public onEntityClick(
    event: MouseEvent,
    config?: ActionConfig | ActionConfigSet,
    entityId?: string
  ): void {
    event.stopPropagation();
    const target = targetOf(event);
    const normalizedConfig = normalizeActionConfig(config);
    if (!target) {
      return;
    }
    if (this._holdTriggered.get(target)) {
      this._holdTriggered.set(target, false);
      return;
    }
    if (!normalizedConfig?.double_tap_action) {
      this._open(event, target, normalizedConfig, entityId, "tap");
      return;
    }
    const existing = this._pendingTapTimeouts.get(target);
    if (existing) {
      clearTimeout(existing);
    }
    const timeout = setTimeout(() => {
      this._open(event, target, normalizedConfig, entityId, "tap");
      this._pendingTapTimeouts.delete(target);
    }, DOUBLE_TAP_DELAY);
    this._pendingTapTimeouts.set(target, timeout);
  }

  public onEntityDoubleClick(
    event: MouseEvent,
    config?: ActionConfig | ActionConfigSet,
    entityId?: string
  ): void {
    const target = targetOf(event);
    const normalizedConfig = normalizeActionConfig(config);
    if (!target) {
      return;
    }
    const existing = this._pendingTapTimeouts.get(target);
    if (existing) {
      clearTimeout(existing);
      this._pendingTapTimeouts.delete(target);
    }
    if (normalizedConfig?.double_tap_action) {
      this._open(event, target, normalizedConfig, entityId, "double_tap");
    }
  }

  public onEntityPointerDown(
    event: PointerEvent,
    config?: ActionConfig | ActionConfigSet,
    entityId?: string
  ): void {
    const target = targetOf(event);
    const normalizedConfig = normalizeActionConfig(config);
    if (!target || !normalizedConfig?.hold_action) {
      return;
    }
    // A value inside a node holds on its own; the node around it must not start a second hold.
    event.stopPropagation();
    const existing = this._holdTimeouts.get(target);
    if (existing) {
      clearTimeout(existing);
    }
    this._holdTriggered.set(target, false);
    const timeout = setTimeout(() => {
      this._holdTriggered.set(target, true);
      this._open(event, target, normalizedConfig, entityId, "hold");
      this._holdTimeouts.delete(target);
    }, HOLD_DELAY);
    this._holdTimeouts.set(target, timeout);
  }

  public onEntityPointerUp(event: PointerEvent): void {
    const target = targetOf(event);
    if (!target) {
      return;
    }
    const holdTimeout = this._holdTimeouts.get(target);
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      this._holdTimeouts.delete(target);
    }
  }
}
