---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
---

fix: cap individual devices at four template topics

A 5th+ entry in `entities.individual` would produce the topic `"undefinedSecondary"` in `_tryConnectAll`, causing template subscriptions to collide. Additionally `_tryDisconnectAll` was disconnecting by the wrong topic name (`"individualSecondary"` instead of the per-position names used by `_tryConnect`), so subscriptions for individual devices were never cleaned up.

- Add `index < individualKeys.length` guard in `_tryConnectAll` for both cards
- Rewrite `_tryDisconnectAll` to use the same per-position topic names as `_tryConnect`
- Cap `entities.individual` at max 4 in the superstruct schema for both cards
- Disable the "add entity" picker in `individual-row-editor` when already at 4 devices, and guard `_addEntity` server-side
