declare global {
  interface Window {
    loadCardHelpers?: () => Promise<unknown>;
  }
}

type LovelaceCardClass = CustomElementConstructor & { getConfigElement?: () => unknown };

/** HA only registers `ha-form` and `ha-entity-picker` once some card's editor has been loaded. */
function loadConfigElementOf(cardTag: string): void {
  const card: LovelaceCardClass | undefined = customElements.get(cardTag);
  card?.getConfigElement?.();
}

export const loadHaForm = async (): Promise<void> => {
  if (!customElements.get("ha-form")) {
    loadConfigElementOf("hui-button-card");
  }
  if (!customElements.get("ha-entity-picker")) {
    loadConfigElementOf("hui-entities-card");
  }
  if (customElements.get("ha-form")) {
    return;
  }

  await window.loadCardHelpers?.();
};
