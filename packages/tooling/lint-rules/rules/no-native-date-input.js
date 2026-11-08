import { defineRule } from "vite-plus/lint/plugins";

const TEMPLATE_TAGS = new Set(["html", "svg"]);
const NATIVE_DATE_INPUT = /<input\b[^>]*\btype=["']?(date|datetime-local|month|week)\b/g;

const noNativeDateInput = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow native date inputs in Lit templates: their browser calendar popover looks nothing like Home Assistant's.",
    },
    messages: {
      noNativeDateInput:
        "`<input type=\"{{type}}\">` opens the browser's own calendar. Use Home Assistant's `<ha-date-range-picker>` (loaded with HA's energy date selection card) instead.",
    },
  },
  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== "Identifier" || !TEMPLATE_TAGS.has(node.tag.name)) {
          return;
        }
        // Bindings such as `aria-label=${label}` may sit between `<input` and `type=`.
        const template = node.quasi.quasis.map((quasi) => quasi.value.raw).join("${}");
        for (const [, type] of template.matchAll(NATIVE_DATE_INPUT)) {
          context.report({ node: node.quasi, messageId: "noNativeDateInput", data: { type } });
        }
      },
    };
  },
});

export default noNativeDateInput;
