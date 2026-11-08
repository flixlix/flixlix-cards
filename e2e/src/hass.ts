import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const HASS_URL = process.env.HASS_URL ?? "http://localhost:8123";
export const CLIENT_ID = `${HASS_URL}/`;
/** The docs site (`apps/web`), which renders the cards with a fake `hass`. */
export const DOCS_URL = process.env.DOCS_URL ?? "http://localhost:3000";
/** Dev-only credentials of the onboarded owner; the instance never leaves localhost. */
export const DEV_USER = { name: "Dev", username: "dev", password: "dev" } as const;
/** Long-lived access token written by the bootstrap; `.hass_dev/*` is gitignored. */
export const TOKEN_FILE = fileURLToPath(new URL("../../.hass_dev/.e2e-token", import.meta.url));

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringField = (value: unknown, key: string, context: string): string => {
  const field = isObject(value) ? value[key] : undefined;
  if (typeof field !== "string") {
    throw new Error(`${context}: expected a string "${key}" in ${JSON.stringify(value)}`);
  }
  return field;
};

const parseJson = (text: string): unknown => (text ? JSON.parse(text) : null);

async function request(
  path: string,
  init: { method?: string; body?: Json | URLSearchParams; token?: string } = {}
): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (init.token) {
    headers.Authorization = `Bearer ${init.token}`;
  }
  let body: string | URLSearchParams | undefined;
  if (init.body instanceof URLSearchParams) {
    body = init.body;
  } else if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  const response = await fetch(`${HASS_URL}${path}`, {
    method: init.method ?? (body === undefined ? "GET" : "POST"),
    headers,
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${init.method ?? (body === undefined ? "GET" : "POST")} ${path} failed with ${response.status}: ${text}`
    );
  }
  return parseJson(text);
}

export const postJson = (path: string, body: Json, token?: string) =>
  request(path, { body, token });

export const getJson = (path: string, token?: string) => request(path, { token });

/** Polls `ready` (a throw counts as not ready) until it holds or the timeout passes. */
export async function waitFor(
  description: string,
  ready: () => Promise<boolean>,
  timeoutMs = 180_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const attempt = async (lastError?: unknown): Promise<void> => {
    if (Date.now() > deadline) {
      throw new Error(`Timed out after ${timeoutMs} ms waiting for ${description}`, {
        cause: lastError,
      });
    }
    let error: unknown;
    try {
      if (await ready()) {
        return;
      }
    } catch (caught) {
      error = caught;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return attempt(error);
  };
  return attempt();
}

export const waitForHttp = () =>
  waitFor(
    `Home Assistant at ${HASS_URL}`,
    async () => (await fetch(`${HASS_URL}/manifest.json`)).ok
  );

/** Home Assistant has finished starting: every integration, script and template is loaded. */
export const waitForRunning = (token: string) =>
  waitFor("Home Assistant to finish starting", async () => {
    const config = await getJson("/api/config", token);
    return isObject(config) && config.state === "RUNNING";
  });

const tokensFrom = (value: unknown): AuthTokens => ({
  access_token: stringField(value, "access_token", "auth/token"),
  refresh_token: stringField(value, "refresh_token", "auth/token"),
  expires_in: isObject(value) && typeof value.expires_in === "number" ? value.expires_in : 1800,
  token_type: stringField(value, "token_type", "auth/token"),
});

export async function exchangeAuthCode(code: string): Promise<AuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID,
  });
  return tokensFrom(await request("/auth/token", { body }));
}

/** Logs the dev user in through the login flow the frontend uses. */
export async function loginWithPassword(): Promise<AuthTokens> {
  const flow = await postJson("/auth/login_flow", {
    client_id: CLIENT_ID,
    handler: ["homeassistant", null],
    redirect_uri: CLIENT_ID,
  });
  const flowId = stringField(flow, "flow_id", "login flow");
  const result = await postJson(`/auth/login_flow/${flowId}`, {
    client_id: CLIENT_ID,
    username: DEV_USER.username,
    password: DEV_USER.password,
  });
  return exchangeAuthCode(stringField(result, "result", "login flow"));
}

export async function readToken(): Promise<string> {
  try {
    return (await readFile(TOKEN_FILE, "utf8")).trim();
  } catch (error) {
    throw new Error(`No Home Assistant token at ${TOKEN_FILE}; run \`pnpm hass:up\` first`, {
      cause: error,
    });
  }
}

export const writeToken = (token: string) => writeFile(TOKEN_FILE, `${token}\n`, { mode: 0o600 });

export const callService = (
  token: string,
  domain: string,
  service: string,
  data: JsonObject = {}
) => postJson(`/api/services/${domain}/${service}`, data, token);

export async function entityState(token: string, entityId: string): Promise<string> {
  return stringField(await getJson(`/api/states/${entityId}`, token), "state", entityId);
}

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

/** A minimal Home Assistant websocket client: authenticate, then request/response by id. */
export class HassSocket {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => this.onMessage(event));
  }

  static connect(accessToken: string): Promise<HassSocket> {
    const socket = new WebSocket(`${HASS_URL.replace(/^http/, "ws")}/api/websocket`);
    const client = new HassSocket(socket);
    return new Promise((resolve, reject) => {
      socket.addEventListener("error", () => reject(new Error(`Websocket to ${HASS_URL} failed`)));
      socket.addEventListener("message", function onAuth(event) {
        const message = parseJson(String(event.data));
        const type = isObject(message) ? message.type : undefined;
        if (type === "auth_required") {
          socket.send(JSON.stringify({ type: "auth", access_token: accessToken }));
        } else if (type === "auth_ok") {
          socket.removeEventListener("message", onAuth);
          resolve(client);
        } else if (type === "auth_invalid") {
          reject(new Error(`Websocket auth rejected: ${JSON.stringify(message)}`));
        }
      });
    });
  }

  call(message: JsonObject): Promise<unknown> {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ ...message, id }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.socket.close();
  }

  private onMessage(event: MessageEvent) {
    const message = parseJson(String(event.data));
    if (!isObject(message) || message.type !== "result" || typeof message.id !== "number") {
      return;
    }
    const pending = this.pending.get(message.id);
    this.pending.delete(message.id);
    if (message.success === true) {
      pending?.resolve(message.result);
    } else {
      pending?.reject(new Error(`Websocket command failed: ${JSON.stringify(message.error)}`));
    }
  }
}
