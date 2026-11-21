import { defineRule } from "vite-plus/lint/plugins";

/** The repository categories Home Assistant's Marketplace (and HACS before it) accepts. */
const CATEGORIES = new Set(["integration", "plugin", "template", "theme"]);
const LINK = /hacs_repository\/?\?[^"'`\s)]*?category=([^&"'`\s)]+)/g;

const hacsLinkCategory = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a valid `category` in My Home Assistant `hacs_repository` links: since Home Assistant 2026.11 they open the Marketplace, which rejects anything but integration, plugin, template or theme (dashboard cards are `plugin`).",
    },
    messages: {
      hacsLinkCategory:
        'The Marketplace rejects `category={{category}}` ("Repositories cannot be added to the {{category}} category"). Dashboard cards are `category=plugin`.',
    },
  },
  create(context) {
    const check = (node, text) => {
      for (const [, category] of text.matchAll(LINK)) {
        if (!CATEGORIES.has(category.toLowerCase())) {
          context.report({ node, messageId: "hacsLinkCategory", data: { category } });
        }
      }
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") {
          check(node, node.value);
        }
      },
      // the whole template, placeholders and all: a link is often built around ${owner}
      TemplateLiteral(node) {
        check(node, node.quasis.map((quasi) => quasi.value.raw).join("${}"));
      },
    };
  },
});

export default hacsLinkCategory;
