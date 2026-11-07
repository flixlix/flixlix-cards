import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";
import { fakeHass, sensor } from "@flixlix-cards/shared/testing/fake-hass";
import { mountCard } from "@flixlix-cards/shared/testing/mount-card";
import { SortableListCard } from "./sortable-list-card";

test("ranked list with handles and arrows", async () => {
  const { card } = await mountCard(
    SortableListCard,
    {
      type: "custom:sortable-list-card",
      title: "Charging priority",
      entity: "input_text.order",
      items: [
        { key: "ev", name: "EV charger", icon: "mdi:ev-station" },
        { key: "battery", name: "Home battery", icon: "mdi:home-battery" },
        { key: "water", name: "Hot water", icon: "mdi:water-boiler" },
      ],
    },
    fakeHass({ states: { "input_text.order": sensor("battery,ev,water", { unit: undefined }) } })
  );
  await expect.element(page.elementLocator(card)).toMatchScreenshot("ranked-list");
});
