import { type Connection, type UnsubscribeFunc } from "home-assistant-js-websocket";

interface TemplateListeners {
  all: boolean;
  domains: string[];
  entities: string[];
  time: boolean;
}
export interface RenderTemplateResult {
  result: string;
  listeners: TemplateListeners;
}

export const subscribeRenderTemplate = (
  conn: Connection,
  onChange: (result: RenderTemplateResult) => void,
  params: {
    template: string;
    entity_ids?: string | string[];
    variables?: Record<string, unknown>;
    timeout?: number;
    strict?: boolean;
  }
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage<RenderTemplateResult>((msg) => onChange(msg), {
    type: "render_template",
    ...params,
  });
