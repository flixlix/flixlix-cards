import { defineRule } from "vite-plus/lint/plugins";

const TEMPLATE_TAGS = new Set(["html", "svg"]);
const EVENT_BINDING = /@([A-Za-z][\w-]*)=["']?$/;

const noCamelcaseEventBinding = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow uppercase letters in Lit `@event` bindings: Lit listens to the name as written and DOM events are lowercase.",
    },
    messages: {
      noCamelcaseEventBinding:
        "Lit listens for `{{name}}` exactly as written, so this handler never runs. Use `@{{lowercase}}`.",
    },
  },
  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== "Identifier" || !TEMPLATE_TAGS.has(node.tag.name)) {
          return;
        }
        for (const quasi of node.quasi.quasis) {
          const name = EVENT_BINDING.exec(quasi.value.raw)?.[1];
          if (name && name !== name.toLowerCase()) {
            context.report({
              node: quasi,
              messageId: "noCamelcaseEventBinding",
              data: { name, lowercase: name.toLowerCase() },
            });
          }
        }
      },
    };
  },
});

export default noCamelcaseEventBinding;
