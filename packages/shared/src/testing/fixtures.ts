import { type FlowCardPlusConfig } from "../types";
import { type HomeAssistant, NumberFormat, TimeFormat } from "custom-card-helpers";

export const fakeHass = (overrides: Partial<HomeAssistant> = {}): HomeAssistant =>
  ({
    states: {},
    locale: {
      language: "en",
      number_format: NumberFormat.language,
      time_format: TimeFormat.language,
    },
    ...overrides,
  }) as HomeAssistant;

export const fakeConfig = (overrides: Partial<FlowCardPlusConfig> = {}): FlowCardPlusConfig =>
  ({ type: "power-flow-card-plus", entities: {}, ...overrides }) as FlowCardPlusConfig;

export const fakeEntity = (
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HomeAssistant["states"][string] =>
  ({ entity_id: entityId, state, attributes }) as HomeAssistant["states"][string];
