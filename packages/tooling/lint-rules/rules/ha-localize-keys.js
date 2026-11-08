import { defineRule } from "vite-plus/lint/plugins";

/** Namespaces Home Assistant's frontend translations live in. */
const HA_KEY = /^(ui|component|state|state_attributes|state_badge)\./;

const haLocalizeKeys = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require `hass.localize` keys to be Home Assistant's: an unknown key translates to an empty string, so the text disappears in Home Assistant.",
    },
    messages: {
      haLocalizeKeys:
        '"{{key}}" is not a Home Assistant translation key, so `hass.localize` returns "" for it. Use one of HA\'s keys (`ui.…`, `component.…`) or the card\'s own `translate`.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        const [first] = node.arguments;
        if (
          callee.type !== "MemberExpression" ||
          callee.property.type !== "Identifier" ||
          callee.property.name !== "localize" ||
          first?.type !== "Literal" ||
          typeof first.value !== "string" ||
          HA_KEY.test(first.value)
        ) {
          return;
        }
        context.report({ node: first, messageId: "haLocalizeKeys", data: { key: first.value } });
      },
    };
  },
});

export default haLocalizeKeys;
