// Regression tests for individual-device template topic safety (plan 011)
// A 5th+ individual must never produce an "undefinedSecondary" topic,
// and disconnect must use the same per-position topic names as connect.

import { assert, StructError } from "superstruct";
import { describe, expect, test, vi } from "vitest";

import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { PowerFlowCardPlus } from "../src/power-flow-card-plus";
import { cardConfigStruct } from "../src/ui-editor/schema/_schema-all";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(individuals: object[]) {
  const card = new PowerFlowCardPlus();
  card.setConfig({
    type: "custom:power-flow-card-plus",
    entities: {
      grid: { entity: "sensor.grid" },
      individual: individuals,
    },
  } as unknown as PowerFlowCardPlusConfig);
  return card;
}

function spyConnectTopics(card: PowerFlowCardPlus): string[] {
  const topics: string[] = [];
  (card as any)._tryConnect = vi.fn((template: string, topic: string) => {
    topics.push(topic);
  });
  (card as any)._tryConnectAll();
  return topics;
}

function spyDisconnectTopics(card: PowerFlowCardPlus): string[] {
  const topics: string[] = [];
  (card as any)._tryDisconnect = vi.fn((topic: string) => {
    topics.push(topic);
  });
  (card as any)._tryDisconnectAll();
  return topics;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("individual template topics", () => {
  test("4 individuals with templates → 4 position topics, no undefined", () => {
    const card = makeCard([
      { entity: "sensor.i1", secondary_info: { template: "{{1}}" } },
      { entity: "sensor.i2", secondary_info: { template: "{{2}}" } },
      { entity: "sensor.i3", secondary_info: { template: "{{3}}" } },
      { entity: "sensor.i4", secondary_info: { template: "{{4}}" } },
    ]);
    const topics = spyConnectTopics(card);
    expect(topics).not.toContain("undefinedSecondary");
    expect(topics).toContain("left-topSecondary");
    expect(topics).toContain("left-bottomSecondary");
    expect(topics).toContain("right-topSecondary");
    expect(topics).toContain("right-bottomSecondary");
  });

  test("5 individuals with templates → still no undefinedSecondary topic", () => {
    const card = makeCard([
      { entity: "sensor.i1", secondary_info: { template: "{{1}}" } },
      { entity: "sensor.i2", secondary_info: { template: "{{2}}" } },
      { entity: "sensor.i3", secondary_info: { template: "{{3}}" } },
      { entity: "sensor.i4", secondary_info: { template: "{{4}}" } },
      { entity: "sensor.i5", secondary_info: { template: "{{5}}" } },
    ]);
    const topics = spyConnectTopics(card);
    expect(topics).not.toContain("undefinedSecondary");
    expect(topics.length).toBe(4); // only 4 templates subscribed
  });

  test("disconnect uses per-position topics that match connect topics", () => {
    const card = makeCard([
      { entity: "sensor.i1", secondary_info: { template: "{{1}}" } },
      { entity: "sensor.i2", secondary_info: { template: "{{2}}" } },
    ]);
    const connectTopics = spyConnectTopics(card);
    // Reset spy then check disconnect uses identical topics
    const disconnectTopics = spyDisconnectTopics(card);
    expect(disconnectTopics).toEqual(expect.arrayContaining(connectTopics));
    expect(disconnectTopics).not.toContain("individualSecondary");
  });

  test("schema accepts up to 4 individuals", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        individual: [
          { entity: "sensor.i1" },
          { entity: "sensor.i2" },
          { entity: "sensor.i3" },
          { entity: "sensor.i4" },
        ],
      },
    };
    expect(() => assert(config, cardConfigStruct)).not.toThrow();
  });

  test("schema rejects 5 individuals", () => {
    const config = {
      type: "custom:power-flow-card-plus",
      entities: {
        grid: { entity: "sensor.grid" },
        individual: [
          { entity: "sensor.i1" },
          { entity: "sensor.i2" },
          { entity: "sensor.i3" },
          { entity: "sensor.i4" },
          { entity: "sensor.i5" },
        ],
      },
    };
    expect(() => assert(config, cardConfigStruct)).toThrow(StructError);
  });
});
