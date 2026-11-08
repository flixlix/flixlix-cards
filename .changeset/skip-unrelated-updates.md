---
"power-flow-card-plus": patch
"energy-flow-card-plus": patch
"energy-breakdown-card": patch
"sortable-list-card": patch
---

Cards no longer recalculate and redraw when an entity they don't show changes in Home Assistant, which lowers CPU and battery use on dashboards, especially on phones and tablets. Numbers are formatted with reused formatters, and the flow cards no longer measure their width on every update.
