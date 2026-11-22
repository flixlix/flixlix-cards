import {
  automationCondition,
  type Condition,
  type ConditionContext,
  serverConditions,
  type ServerVerdict,
} from "@flixlix-cards/shared/card-state";
import { type HomeAssistant } from "custom-card-helpers";
import { type Connection, type UnsubscribeFunc } from "home-assistant-js-websocket";
import { type ReactiveController, type ReactiveElement } from "lit";
import { liveConditionContext } from "./condition-context";

type ConditionMessage = { result: boolean; error?: undefined } | { error: string };

/**
 * How Home Assistant turns the subscription down before 2026.10: it has no such command before
 * 2026.6, and lets only admins use it before 2026.10.
 */
const UNSUPPORTED = new Set(["unknown_command", "unauthorized"]);

const errorCode = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

const keyOf = (condition: Condition) => JSON.stringify(condition);

/**
 * Home Assistant's verdicts on a card's conditions that only it can check, as a dashboard asks
 * for them; the card updates when one changes. {@link context} hands them to `conditionsMet`.
 */
export class ServerConditionsController implements ReactiveController {
  private readonly _verdicts = new Map<string, ServerVerdict>();
  private readonly _subscriptions = new Map<string, Promise<UnsubscribeFunc>>();
  private _connection?: Connection;
  private _connected = false;

  readonly context: ConditionContext = {
    ...liveConditionContext,
    server: (condition) => this._verdicts.get(keyOf(condition)) ?? "local",
  };

  constructor(
    private readonly _host: ReactiveElement,
    private readonly _source: () => { hass: HomeAssistant | undefined; conditions: Condition[] }
  ) {
    _host.addController(this);
  }

  hostConnected(): void {
    this._connected = true;
    this.sync();
  }

  hostDisconnected(): void {
    this._connected = false;
    this._unsubscribeAll();
  }

  /** Follows the card's current conditions. Cheap to call on every update. */
  sync(): void {
    const { hass, conditions } = this._source();
    const connection = hass?.connection;
    if (!this._connected || !connection) {
      return;
    }
    if (connection !== this._connection) {
      this._unsubscribeAll();
      this._connection = connection;
    }
    const wanted = new Map(
      serverConditions(conditions).map((condition) => [keyOf(condition), condition])
    );
    for (const key of this._subscriptions.keys()) {
      if (!wanted.has(key)) {
        this._unsubscribe(key);
      }
    }
    for (const [key, condition] of wanted) {
      if (!this._subscriptions.has(key)) {
        this._subscribe(connection, key, condition);
      }
    }
  }

  private _subscribe(connection: Connection, key: string, condition: Condition) {
    this._verdicts.set(key, "pending");
    const current = () => this._subscriptions.get(key) === subscription;
    const subscription = connection.subscribeMessage<ConditionMessage>(
      (message) => {
        if (current()) {
          // as on a dashboard, a condition Home Assistant fails to check does not hold
          this._setVerdict(key, "result" in message && message.result);
        }
      },
      { type: "subscribe_condition", condition: automationCondition(condition) }
    );
    this._subscriptions.set(key, subscription);
    subscription.catch((error: unknown) => {
      if (current()) {
        const code = errorCode(error);
        this._setVerdict(key, typeof code === "string" && UNSUPPORTED.has(code) ? "local" : false);
      }
    });
  }

  private _setVerdict(key: string, verdict: ServerVerdict) {
    if (this._verdicts.get(key) !== verdict) {
      this._verdicts.set(key, verdict);
      this._host.requestUpdate();
    }
  }

  private _unsubscribe(key: string) {
    const subscription = this._subscriptions.get(key);
    this._subscriptions.delete(key);
    this._verdicts.delete(key);
    // a subscription that failed has nothing to end; _subscribe handles its error
    subscription?.then((unsubscribe) => unsubscribe()).catch(() => undefined);
  }

  private _unsubscribeAll() {
    for (const key of this._subscriptions.keys()) {
      this._unsubscribe(key);
    }
    this._connection = undefined;
  }
}
