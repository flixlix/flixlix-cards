import { type Locator } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { CARD_DASHBOARDS } from "../src/dashboards.ts";
import { cardByTitle, expect, openDashboard, runScript, test } from "../src/fixtures.ts";
import { DOCS_URL } from "../src/hass.ts";

// The docs render the cards without Home Assistant: its theme, `ha-card`, icons and ripple copied into
// packages/shared/src/preview/, and a fake `hass`. These tests hold the docs to looking exactly
// like the card on a real dashboard. When they fail after an HA update, run `pnpm hass:sync-theme`.

/** Differing pixels allowed; anti-aliasing at the edge of a moving dot's start can differ. */
const MAX_DIFF_PIXELS = 20;

const CASES = [
  { scenario: "scenario_solver_regression", title: "Split entities" },
  { scenario: "scenario_grid_outage_generator", title: "Power outage with generator" },
  { scenario: "scenario_more_than_four_individuals", title: "Six individuals" },
];

test.afterAll(async () => {
  await runScript("scenario_default");
});

/** Stops CSS motion and parks every flow dot at the start of its path. */
const freeze = (card: Locator) =>
  card.evaluate((element) => {
    const root = element.shadowRoot;
    if (!root) {
      throw new Error("card has no shadow root");
    }
    const still = new CSSStyleSheet();
    still.replaceSync(
      "*, *::before, *::after { animation: none !important; transition: none !important; }"
    );
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, still];
    // flow dots run as Web Animations: park each at the start of its loop, as the unit tests do
    root.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
  });

const fraction = (value: number) => value - Math.floor(value);

/**
 * Shifts the docs card onto the same subpixel offset as the card in HA: the pages around them
 * differ, and a card a fraction of a pixel lower rasterises every edge and glyph differently.
 */
const alignSubpixels = async (haCard: Locator, docsCard: Locator) => {
  const [ha, docs] = await Promise.all([haCard.boundingBox(), docsCard.boundingBox()]);
  if (!ha || !docs) {
    throw new Error("card is not on the page");
  }
  const left = fraction(ha.x) - fraction(docs.x);
  const top = fraction(ha.y) - fraction(docs.y);
  await docsCard.evaluate(
    (element, offset) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error("card is not an HTML element");
      }
      element.style.position = "relative";
      element.style.left = `${offset.left}px`;
      element.style.top = `${offset.top}px`;
    },
    { left, top }
  );
};

/** The card's dashboard config and the states of every entity it names, as HA has them. */
const readCard = (card: Locator) =>
  card.evaluate((element) => {
    const parent = element.parentElement;
    const config: unknown = parent && "config" in parent ? parent.config : undefined;
    const hass: unknown = "hass" in element ? element.hass : undefined;
    const allStates =
      hass && typeof hass === "object" && "states" in hass && hass.states ? hass.states : {};
    const ids = new Set(JSON.stringify(config).match(/\b[a-z_]+\.[a-z0-9_]+\b/g));
    const states: Record<string, unknown> = Object.fromEntries(
      Object.entries(allStates).filter(([id]) => ids.has(id))
    );
    return { config, states, width: element.getBoundingClientRect().width };
  });

/**
 * Number of pixels that differ between two PNG screenshots of the same size. Anti-aliased edge
 * pixels don't count: Chrome rasterises the same ring edge a little differently depending on
 * what the card is composited into, and HA's page and the docs' are built differently.
 */
const diffPixels = (a: Buffer, b: Buffer) => {
  const [first, second] = [PNG.sync.read(a), PNG.sync.read(b)];
  if (first.width !== second.width || first.height !== second.height) {
    return Number.POSITIVE_INFINITY;
  }
  return pixelmatch(first.data, second.data, undefined, first.width, first.height, {
    threshold: 0.1,
  });
};

for (const { scenario, title } of CASES) {
  test(`docs render "${title}" as Home Assistant does`, async ({ page, browser }, testInfo) => {
    await runScript(scenario);
    await openDashboard(page, CARD_DASHBOARDS["power-flow-card-plus"]);
    const haCard = cardByTitle(page, "power-flow-card-plus", title);
    await expect(haCard.locator("ha-card")).toBeVisible();
    // Let a card that shows readings settle; HA's fonts load lazily.
    await page.evaluate(() => document.fonts.ready);
    const { config, states, width } = await readCard(haCard);

    const docs = await browser.newPage({ viewport: page.viewportSize() ?? undefined });
    const playground = { yaml: JSON.stringify(config), states, width };
    const search = new URLSearchParams({ s: JSON.stringify(playground) });
    await docs.goto(`${DOCS_URL}/power-flow-card-plus/playground?${search}`);
    const docsCard = docs.locator("[data-card-preview] power-flow-card-plus");
    await expect(docsCard.locator("ha-card")).toBeVisible();
    await docs.evaluate(() => document.fonts.ready);
    expect((await docsCard.boundingBox())?.width).toBeCloseTo(width, 0);

    await Promise.all([freeze(haCard), freeze(docsCard)]);
    await alignSubpixels(haCard, docsCard);
    const [inHa, inDocs] = await Promise.all([
      haCard.screenshot({ animations: "disabled" }),
      docsCard.screenshot({ animations: "disabled" }),
    ]);
    await testInfo.attach("home-assistant.png", { body: inHa, contentType: "image/png" });
    await testInfo.attach("docs.png", { body: inDocs, contentType: "image/png" });
    expect(diffPixels(inHa, inDocs)).toBeLessThanOrEqual(MAX_DIFF_PIXELS);
    await docs.close();
  });
}
