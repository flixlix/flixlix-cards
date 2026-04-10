import { expect, test } from "vitest";
import "./test"; // Import the element to register it
import { type PowerFlowCardPlus } from "./test.js";

test("should be registered as a custom element", () => {
  expect(customElements.get("energy-flow-card-plus")).toBeDefined();
});

test("should render with default title", async () => {
  // 1. Create the element
  const el = document.createElement("energy-flow-card-plus") as PowerFlowCardPlus;
  document.body.appendChild(el);

  // 2. Wait for Lit's reactive update cycle
  await el.updateComplete;

  // 3. Query the shadow DOM
  const header = el.shadowRoot?.querySelector("h1");
  expect(header?.textContent).toBe("Power Flow");
});
