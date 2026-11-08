import { defineRule } from "vite-plus/lint/plugins";

const TEMPLATE_TAGS = new Set(["html", "svg"]);
const SLICE = /preserveAspectRatio\s*=\s*["']?[^"'>]*\bslice\b/;

const noSlicedSvg = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow `preserveAspectRatio="… slice"` in Lit templates: a sliced viewBox scales with the card while the node circles stay 80px, so lines miss their circles at most widths.',
    },
    messages: {
      noSlicedSvg:
        "A sliced viewBox crops and rescales with the card's width, so its lines cannot meet the fixed-size circles. Draw flow lines in pixels from the measured layout (components/flows/geometry.ts).",
    },
  },
  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== "Identifier" || !TEMPLATE_TAGS.has(node.tag.name)) {
          return;
        }
        for (const quasi of node.quasi.quasis) {
          if (SLICE.test(quasi.value.raw)) {
            context.report({ node: quasi, messageId: "noSlicedSvg" });
          }
        }
      },
    };
  },
});

export default noSlicedSvg;
