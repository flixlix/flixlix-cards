import { defineRule } from "vite-plus/lint/plugins";

const noCardResizeObserver = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `new ResizeObserver` in a card: Home Assistant takes cards out and puts them back while a dashboard loads, and an observer set up from the card's own lifecycle is easily lost on the way, leaving the card at the width it had while it was out. Use `WidthController` from `@flixlix-cards/shared/utils/width-controller`.",
    },
    messages: {
      noCardResizeObserver:
        "Watch a card's width with `WidthController` (@flixlix-cards/shared/utils/width-controller): it reconnects when Home Assistant puts the card back.",
    },
  },
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "ResizeObserver") {
          context.report({ node, messageId: "noCardResizeObserver" });
        }
      },
    };
  },
});

export default noCardResizeObserver;
