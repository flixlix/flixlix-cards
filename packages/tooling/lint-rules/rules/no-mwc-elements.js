import { defineRule } from "vite-plus/lint/plugins";

const TEMPLATE_TAGS = new Set(["html", "svg"]);
const MWC_TAG = /<(mwc-[\w-]+)/g;

const noMwcElements = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `mwc-*` elements in Lit templates: Home Assistant no longer ships Material Web Components, so they render as empty, unstyled tags.",
    },
    messages: {
      noMwcElements:
        "Home Assistant no longer defines `<{{tag}}>`, so it renders empty. Use a native element (`<button>`, `<input>`) or an always-loaded HA element.",
    },
  },
  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== "Identifier" || !TEMPLATE_TAGS.has(node.tag.name)) {
          return;
        }
        for (const quasi of node.quasi.quasis) {
          for (const [, tag] of quasi.value.raw.matchAll(MWC_TAG)) {
            context.report({ node: quasi, messageId: "noMwcElements", data: { tag } });
          }
        }
      },
    };
  },
});

export default noMwcElements;
