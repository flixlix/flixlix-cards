import { defineRule } from "vite-plus/lint/plugins";

const TEMPLATE_TAGS = new Set(["html", "svg"]);
const ANIMATE_MOTION = /<animateMotion\b[^>]*>/g;

const noPacedKeyPoints = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow `keyPoints` on an `<animateMotion calcMode="paced">`: older Chromium ignores `keyPoints` in paced mode and plays the dot backwards.',
    },
    messages: {
      noPacedKeyPoints:
        '`keyPoints` is ignored with `calcMode="paced"` on older Chromium (e.g. Fire tablets), so the dot runs the wrong way. Use `calcMode="linear"` with `keyTimes`.',
    },
  },
  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== "Identifier" || !TEMPLATE_TAGS.has(node.tag.name)) {
          return;
        }
        const template = node.quasi.quasis.map((quasi) => quasi.value.raw).join("${}");
        for (const [element] of template.matchAll(ANIMATE_MOTION)) {
          if (/\bkeyPoints=/.test(element) && /\bcalcMode=["']?paced\b/.test(element)) {
            context.report({ node: node.quasi, messageId: "noPacedKeyPoints" });
          }
        }
      },
    };
  },
});

export default noPacedKeyPoints;
