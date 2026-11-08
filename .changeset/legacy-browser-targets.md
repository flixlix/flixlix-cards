---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
"energy-breakdown-card": patch
"sortable-list-card": patch
"energy-period-selector-plus": patch
---

Cards load again on Google Cast displays (Chromecast, Nest Hub) and other older browsers and wall-panel webviews that Home Assistant itself still supports (Chromium 67 and newer). Before, the cards shipped optional chaining (`?.`) and nullish coalescing (`??`), which those browsers cannot read, so the card stayed empty or showed "Configuration Error". The cards are about 5% larger as a result.
