/*
  Copied from https://github.com/home-assistant/frontend/blob/master/src/mixins/subscribe-mixin.ts
*/

import { type HomeAssistant } from "custom-card-helpers";
import { type UnsubscribeFunc } from "home-assistant-js-websocket";
import { type PropertyValues, type ReactiveElement } from "lit";
import { property } from "lit/decorators.js";

export interface HassSubscribeElement {
  hass?: HomeAssistant;
  hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>>;
  resetSubscriptions(): void;
}

export type Constructor<T = any> = new (...args: any[]) => T;

export const SubscribeMixin = <T extends Constructor<ReactiveElement>>(
  superClass: T
): Constructor<InstanceType<T> & HassSubscribeElement> & T => {
  class SubscribeClass extends superClass {
    @property({ attribute: false }) public hass?: HomeAssistant;

    private __unsubs?: Array<UnsubscribeFunc | Promise<UnsubscribeFunc>>;

    public connectedCallback() {
      super.connectedCallback();
      this.__checkSubscribed();
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this.hassUnsubscribe();
    }

    protected updated(changedProps: PropertyValues) {
      super.updated(changedProps);
      if (changedProps.has("hass")) {
        this.__checkSubscribed();
      }
    }

    public resetSubscriptions(): void {
      this.hassUnsubscribe();
      this.__checkSubscribed();
    }

    protected hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
      return [];
    }

    protected hassUnsubscribe() {
      if (this.__unsubs) {
        while (this.__unsubs.length) {
          const unsub = this.__unsubs.pop()!;
          if (unsub instanceof Promise) {
            unsub.then((unsubFunc) => unsubFunc());
          } else {
            unsub();
          }
        }
        this.__unsubs = undefined;
      }
    }

    private __checkSubscribed(): void {
      if (
        this.__unsubs !== undefined ||
        !(this as unknown as Element).isConnected ||
        this.hass === undefined
      ) {
        return;
      }
      this.__unsubs = this.hassSubscribe();
    }
  }
  return SubscribeClass as unknown as Constructor<InstanceType<T> & HassSubscribeElement> & T;
};
