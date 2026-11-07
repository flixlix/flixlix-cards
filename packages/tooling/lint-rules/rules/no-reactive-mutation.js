import { defineRule } from "vite-plus/lint/plugins";

const MUTATING_METHODS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
  "set",
  "add",
  "delete",
  "clear",
]);

const REACTIVE_DECORATORS = new Set(["state", "property"]);

function decoratorName(decorator) {
  const expression = decorator.expression;
  if (expression.type === "CallExpression" && expression.callee.type === "Identifier") {
    return expression.callee.name;
  }
  return expression.type === "Identifier" ? expression.name : undefined;
}

function reactiveFieldNames(classBody) {
  const names = new Set();
  for (const member of classBody.body) {
    const isReactive = (member.decorators ?? []).some((decorator) =>
      REACTIVE_DECORATORS.has(decoratorName(decorator))
    );
    if (isReactive && member.key?.type === "Identifier") {
      names.add(member.key.name);
    }
  }
  return names;
}

/** `this.field` at the root of a member chain, or undefined. */
function thisFieldAccess(node) {
  let current = node;
  while (current.type === "MemberExpression" && current.object.type === "MemberExpression") {
    current = current.object;
  }
  if (
    current.type === "MemberExpression" &&
    current.object.type === "ThisExpression" &&
    !current.computed &&
    current.property.type === "Identifier"
  ) {
    return current;
  }
  return undefined;
}

const noReactiveMutation = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow in-place mutation of Lit `@state`/`@property` fields; Lit only re-renders on reassignment.",
    },
    messages: {
      noReactiveMutation:
        "`this.{{field}}` is reactive, but mutating it in place does not trigger a re-render. Assign a new value instead.",
    },
  },
  create(context) {
    const scopes = [];
    const isReactive = (name) => scopes.length > 0 && scopes[scopes.length - 1].has(name);

    function reportIfNestedMutation(target) {
      if (target.type !== "MemberExpression") {
        return;
      }
      const root = thisFieldAccess(target);
      if (root && root !== target && isReactive(root.property.name)) {
        context.report({
          node: target,
          messageId: "noReactiveMutation",
          data: { field: root.property.name },
        });
      }
    }

    return {
      ClassBody(node) {
        scopes.push(reactiveFieldNames(node));
      },
      "ClassBody:exit"() {
        scopes.pop();
      },
      AssignmentExpression(node) {
        reportIfNestedMutation(node.left);
      },
      UpdateExpression(node) {
        reportIfNestedMutation(node.argument);
      },
      UnaryExpression(node) {
        if (node.operator === "delete") {
          reportIfNestedMutation(node.argument);
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.property.type !== "Identifier") {
          return;
        }
        if (!MUTATING_METHODS.has(callee.property.name)) {
          return;
        }
        const root = thisFieldAccess(callee.object);
        if (root && isReactive(root.property.name)) {
          context.report({
            node,
            messageId: "noReactiveMutation",
            data: { field: root.property.name },
          });
        }
      },
    };
  },
});

export default noReactiveMutation;
