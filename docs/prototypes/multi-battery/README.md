# Multi-battery visual & config prototypes

Interactive HTML mockups exploring how multiple batteries could look in
power-flow-card-plus / energy-flow-card-plus.

Open [`index.html`](./index.html) in a browser, or the individual `proto-*.html` files.

| Prototype | Idea | Status |
| --- | --- | --- |
| **A** | Multi-circle bottom row; each pack has SoC + in/out; flows use aggregate totals | Supported (multi primary) |
| **B** | Same as A with 3 denser circles (layout stress test) | Same config model as A |
| **C** | Single battery tile; pipe-sum entities + min–max / weighted SoC | Not shipped (Approach A) |
| **D** | Primary battery in graph + dashed satellite packs (`role: primary \| satellite`) | Shipped |

Screenshots live in [`screenshots/`](./screenshots/).
